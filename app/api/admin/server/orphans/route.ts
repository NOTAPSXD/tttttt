import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { unassignServer } from "@/lib/ownership";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * ORPHANED = a mapped record whose provider no longer lists the asset
 * (flagged automatically by the provider sync via `providerDeletedAt`).
 * GET lists them; DELETE purges the record after detaching ownership so the
 * operation is auditable and never silently destroys an assignment.
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();

    const records = await Server.find({ providerDeletedAt: { $ne: null } })
        .populate("ownerId", "name email")
        .lean();

    const orphans = records.map((s: any) => {
        const owner = s.ownerId;
        return {
            id: String(s._id),
            providerServerId: s.providerServerId,
            providerType: s.providerType || "virtfusion",
            name: s.name,
            ip: s.ip || null,
            user: owner
                ? { id: String(owner._id), name: owner.name || "Unknown", email: owner.email || "" }
                : { id: null, name: "Unknown", email: "" },
            deletedOnProviderAt: s.providerDeletedAt ? new Date(s.providerDeletedAt).toISOString() : null,
        };
    });

    return NextResponse.json({ orphans });
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    if (ids.length === 0) return NextResponse.json({ error: "No server ids provided" }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const actor = { id: String(session.user.id), role: String(session.user.role), email: session.user.email ?? undefined };

    let purged = 0;
    for (const id of ids) {
        const server: any = await Server.findById(id);
        // Only orphaned records may be purged (protects live assignments).
        if (!server || !server.providerDeletedAt) continue;

        await unassignServer({ serverId: id, actor, reason: "Orphaned record purged", ip });
        await Server.findByIdAndDelete(id);
        purged += 1;
    }

    return NextResponse.json({ success: true, deletedCount: purged });
}