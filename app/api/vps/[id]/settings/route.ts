import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const { id } = await params;
        const { name, hostname } = await req.json().catch(() => ({}));

        if (!name || name.trim().length === 0) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (name.length > 50) return NextResponse.json({ error: "Name too long (max 50 characters)" }, { status: 400 });
        if (hostname && String(hostname).length > 100) return NextResponse.json({ error: "Hostname too long" }, { status: 400 });

        const server: any = await Server.findById(id);
        if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

        const admin = isAdmin(String(session.user.role));

        // Clients can only modify their own servers.
        if (!admin && String(server.ownerId || "") !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const patch: Record<string, any> = { name: name.trim() };
        if (hostname && typeof hostname === "string") patch.hostname = hostname.trim();

        const updatedServer = await Server.findByIdAndUpdate(id, patch, { new: true });

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        await logAudit(
            { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            "SERVER_SETTINGS_UPDATED",
            { id, type: "server", name: server.name },
            { name: server.name },
            patch,
            { ip }
        );

        return NextResponse.json({ success: true, server: updatedServer });
    } catch (error) {
        console.error("Error updating settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}