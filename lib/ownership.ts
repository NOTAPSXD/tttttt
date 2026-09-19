import mongoose from "mongoose";
import { connectDB, Server, ServerAssignment, User } from "@/lib/db";
import { logAudit, notifyUser, withTransaction, ActorRef } from "@/lib/audit";

export interface AssignInput {
    serverId?: string;
    providerServerId?: string;
    toUserId: string;
    actor?: ActorRef;
    reason?: string;
    ip?: string;
}

export type AssignResult =
    | { ok: true; status: "assigned" | "transferred" | "unchanged"; serverId: string; ownerId: string | null }
    | { ok: false; status: number; error: string };

const validId = (v: string): boolean => mongoose.isValidObjectId(v);

/**
 * The ONLY place ownership changes happen. Updates the server's owner fields,
 * closes the previous assignment, inserts the new one, writes the audit log
 * and notifies both owners — inside a single transaction when possible.
 */
export async function assignServer(input: AssignInput): Promise<AssignResult> {
    if (!input.toUserId) return { ok: false, status: 400, error: "A target user is required." };
    if (!input.serverId && !input.providerServerId) {
        return { ok: false, status: 400, error: "A server is required." };
    }

    await connectDB();

    const server = input.serverId
        ? await Server.findById(input.serverId)
        : await Server.findOne({ providerServerId: input.providerServerId });

    if (!server) return { ok: false, status: 404, error: "Server not found." };
    if (!validId(input.toUserId)) return { ok: false, status: 400, error: "Invalid user id." };

    const toUser = await User.findById(input.toUserId).lean();
    if (!toUser) return { ok: false, status: 404, error: "User not found." };
    if (toUser.status === "suspended" || toUser.suspended) {
        return { ok: false, status: 400, error: "Cannot assign a server to a suspended user." };
    }

    const serverId = String(server._id);
    const currentOwner = server.ownerId ? String(server.ownerId) : null;

    if (currentOwner === input.toUserId) {
        return { ok: true, status: "unchanged", serverId, ownerId: input.toUserId };
    }

    const action = currentOwner ? "SERVER_TRANSFERRED" : "SERVER_ASSIGNED";
    const fromUserId = currentOwner || null;

    const result = await withTransaction(async (session) => {
        const opts = session ? { session } : {};
        if (currentOwner) {
            await ServerAssignment.updateMany({ serverId: server._id, active: true }, { $set: { active: false } }, opts);
        }
        await ServerAssignment.create(
            [
                {
                    serverId: server._id,
                    fromUserId,
                    toUserId: input.toUserId,
                    actorId: input.actor?.id || null,
                    reason: input.reason || (currentOwner ? "Transferred" : "Initial assignment"),
                    active: true,
                },
            ],
            session ? { session } : {}
        );
        await Server.updateOne(
            { _id: server._id },
            { $set: { ownerId: input.toUserId, ownerEmail: toUser.email, ownerName: toUser.name } },
            opts
        );
        await logAudit(
            input.actor || {},
            action,
            { id: serverId, type: "server", name: server.name },
            { ownerId: fromUserId },
            { ownerId: input.toUserId },
            { ip: input.ip, session: session as any }
        );
    });

    if (!result.ok) {
        console.error("assignServer transaction failed:", result.error);
        return { ok: false, status: 500, error: "Ownership change failed. Please try again." };
    }

    await notifyUser(
        input.toUserId,
        currentOwner ? "Server reassigned to you" : "Server assigned to you",
        `"${server.name}" ${currentOwner ? "has been transferred" : "has been assigned"} to your account.`
    ).catch(() => {});

    if (currentOwner) {
        await notifyUser(
            currentOwner,
            "Server no longer assigned",
            `"${server.name}" was reassigned away from your account${input.reason ? ` (${input.reason})` : ""}.`
        ).catch(() => {});
    }

    return { ok: true, status: currentOwner ? "transferred" : "assigned", serverId, ownerId: input.toUserId };
}

/** Detach ownership without deleting the server record. */
export async function unassignServer(input: {
    serverId: string;
    actor?: ActorRef;
    reason?: string;
    ip?: string;
}): Promise<AssignResult> {
    await connectDB();
    const server = await Server.findById(input.serverId);
    if (!server) return { ok: false, status: 404, error: "Server not found." };

    const serverId = String(server._id);
    const currentOwner = server.ownerId ? String(server.ownerId) : null;

    const result = await withTransaction(async (session) => {
        const opts = session ? { session } : {};
        if (currentOwner) {
            await ServerAssignment.updateMany({ serverId: server._id, active: true }, { $set: { active: false } }, opts);
        }
        await Server.updateOne(
            { _id: server._id },
            { $set: { ownerId: null, ownerEmail: null, ownerName: null } },
            opts
        );
        await logAudit(
            input.actor || {},
            "SERVER_UNASSIGNED",
            { id: serverId, type: "server", name: server.name },
            { ownerId: currentOwner },
            { ownerId: null },
            { ip: input.ip, session: session as any }
        );
    });

    if (!result.ok) {
        console.error("unassignServer transaction failed:", result.error);
        return { ok: false, status: 500, error: "Could not unassign this server. Please try again." };
    }

    if (currentOwner) {
        await notifyUser(
            currentOwner,
            "Server unassigned",
            `"${server.name}" is no longer assigned to your account${input.reason ? ` (${input.reason})` : ""}.`
        ).catch(() => {});
    }

    return { ok: true, status: "unchanged", serverId, ownerId: null };
}