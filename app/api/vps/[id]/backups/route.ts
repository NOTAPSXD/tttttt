import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User } from "@/lib/db";
import { getAdapterForServer, getCapabilities } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

    const caps = await getCapabilities(server.providerType).catch(() => null);
    if (caps && !caps.backups) return NextResponse.json([]);

    try {
        const adapter = getAdapterForServer(server);
        const backups = await adapter.getBackups(server.providerServerId);
        return NextResponse.json(
            (backups || []).map((b) => ({
                id: b.id,
                name: b.name || "Backup",
                size: b.sizeBytes ? `${(b.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : "—",
                sizeBytes: b.sizeBytes,
                createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
                created: b.createdAt,
                status: "completed",
            }))
        );
    } catch (e) {
        console.error("Fetch backups error:", e);
        return NextResponse.json({ error: "Failed to fetch backups" }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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
        const result = await adapter.createBackup(server.providerServerId);
        if (!result.success) {
            return NextResponse.json({ error: result.error?.message || "The provider rejected this request." }, { status: 500 });
        }
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        await logAudit(
            { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            "SERVER_BACKUP_CREATED",
            { id, type: "server", name: server.name },
            undefined,
            undefined,
            { ip }
        );
        return NextResponse.json({ message: "Backup creation initiated.", success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed to create backup" }, { status: 500 });
    }
}