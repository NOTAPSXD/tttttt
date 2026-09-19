import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { getAdapterForServer, getCapabilities } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { logAudit, providerErrorToResponse } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; backupId: string }> }) {
    const { id, backupId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

    const caps = await getCapabilities(server.providerType).catch(() => null);
    if (caps && !caps.backups) {
        return NextResponse.json({ error: "Backups are not available for this infrastructure." }, { status: 400 });
    }

    try {
        const adapter = getAdapterForServer(server);
        const result = await adapter.deleteBackup(server.providerServerId, backupId);
        if (!result.success) {
            return NextResponse.json({ error: result.error?.message || "The provider rejected this request." }, { status: 500 });
        }
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        await logAudit(
            { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            "SERVER_BACKUP_DELETED",
            { id, type: "server", name: server.name },
            undefined,
            { backupId },
            { ip }
        );
        return NextResponse.json({ message: "Backup deleted successfully.", backupId });
    } catch (e) {
        const mapped = providerErrorToResponse(e);
        return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
}