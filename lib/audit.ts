import mongoose, { ClientSession } from "mongoose";
import { connectDB, AuditLog, Notification } from "@/lib/db";
import { ProviderError, ProviderErrorPayload } from "@/lib/providers";

export interface ActorRef {
    id?: string;
    role?: string;
    email?: string;
}

export interface AuditTarget {
    id: string;
    type: string;
    name?: string;
}

/**
 * Run a multi-step write inside a transaction when the deployment supports it
 * (replica set / Atlas). On standalone Mongo the transaction request fails with
 * IllegalOperation; we fall back to ordered sequential writes and continue.
 */
export async function withTransaction<T>(
    fn: (session: ClientSession | null) => Promise<T>
): Promise<{ ok: true; result: T } | { ok: false; error: unknown }> {
    await connectDB();
    const session = await mongoose.startSession();

    try {
        const result = await session.withTransaction(async () => fn(session));
        return { ok: true, result };
    } catch (error: any) {
        const isStandalone = error?.codeName === "IllegalOperation" || error?.message?.includes("transaction numbers are only allowed");
        if (isStandalone) {
            console.warn("[db] replica set unavailable; falling back to ordered writes (no rollback).");
            try {
                const result = await fn(null);
                return { ok: true, result };
            } catch (e2) {
                return { ok: false, error: e2 };
            }
        }
        return { ok: false, error };
    } finally {
        await session.endSession();
    }
}

export async function logAudit(
    actor: ActorRef,
    action: string,
    target?: AuditTarget,
    before?: unknown,
    after?: unknown,
    meta?: { ip?: string; userAgent?: string; session?: ClientSession | null }
): Promise<void> {
    try {
        await connectDB();
        const doc = {
            actorId: actor.id || null,
            actorRole: actor.role || null,
            actorEmail: actor.email || null,
            action,
            targetId: target?.id || null,
            targetType: target?.type || null,
            targetName: target?.name || null,
            before,
            after,
            ip: meta?.ip,
            userAgent: meta?.userAgent,
        };
        if (meta?.session) {
            await AuditLog.create([doc], { session: meta.session });
        } else {
            await AuditLog.create(doc);
        }
    } catch (e) {
        console.error("logAudit error:", e);
    }
}

export async function notifyUser(
    userId: string,
    title: string,
    message: string,
    opts?: { type?: "info" | "warning" | "success" | "error"; link?: string; session?: ClientSession | null }
): Promise<void> {
    try {
        await connectDB();
        const doc = {
            userId: String(userId),
            title,
            message,
            read: false,
            readAt: null,
            type: opts?.type || "info",
            link: opts?.link,
        };
        if (opts?.session) {
            await Notification.create([doc], { session: opts.session });
        } else {
            await Notification.create(doc);
        }
    } catch (e) {
        console.error("notifyUser error:", e);
    }
}

/** Map provider errors to a safe message + HTTP-ish status for user-facing APIs. */
export function providerErrorToResponse(e: unknown): { status: number; message: string; raw?: string } {
    if (e instanceof ProviderError) {
        const payload: ProviderErrorPayload = e.toPayload();
        let status = 502;
        switch (e.code) {
            case "NOT_FOUND":
                status = 404;
                break;
            case "UNSUPPORTED":
                status = 400;
                break;
            case "UNAUTHORIZED":
                status = 401;
                break;
            case "FORBIDDEN":
                status = 403;
                break;
            case "RATE_LIMITED":
                status = 429;
                break;
        }
        return { status, message: payload.message, raw: payload.raw };
    }
    const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
    return { status: 500, message: msg };
}