import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { notifyUser, logAudit } from "@/lib/audit";

async function setSuspended(id: string, session: any, req: Request, suspended: boolean) {
    const action = suspended ? "SERVER_SUSPENDED" : "SERVER_UNSUSPENDED";

    const server: any = await Server.findById(id);
    if (!server) return new NextResponse("Server not found", { status: 404 });

    const updated = await Server.findByIdAndUpdate(id, { suspended }, { new: true });

    if (server.ownerId) {
        await notifyUser(
            String(server.ownerId),
            suspended ? "Service Suspended" : "Service Restored",
            suspended
                ? `Your server "${server.name}" has been suspended. Please contact support.`
                : `Your server "${server.name}" has been restored and is now active.`
        );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    await logAudit(
        { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
        action,
        { id, type: "server", name: server.name },
        { suspended: !!server.suspended },
        { suspended },
        { ip }
    );

    return NextResponse.json(updated);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 401 });

    try {
        await connectDB();
        return await setSuspended(id, session, req, true);
    } catch (error) {
        return NextResponse.json({ error: "Failed to suspend server" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 401 });

    try {
        await connectDB();
        return await setSuspended(id, session, req, false);
    } catch (error) {
        return NextResponse.json({ error: "Failed to unsuspend server" }, { status: 500 });
    }
}