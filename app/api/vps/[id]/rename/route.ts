import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parseBody, renameSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const { id } = await params;
        const parsed = await parseBody(req, renameSchema);
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
        const { name } = parsed.data;

        const server: any = await Server.findById(id);
        if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

        const admin = isAdmin(String(session.user.role));

        // Clients can only rename their own servers.
        if (!admin && String(server.ownerId || "") !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const trimmed = name.trim();
        const updatedServer = await Server.findByIdAndUpdate(id, { name: trimmed }, { new: true });

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        await logAudit(
            { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            "SERVER_RENAMED",
            { id, type: "server", name: server.name },
            { name: server.name },
            { name: trimmed },
            { ip }
        );

        return NextResponse.json({ success: true, server: updatedServer });
    } catch (error) {
        console.error("Error renaming server:", error);
        return NextResponse.json({ error: "Failed to rename server" }, { status: 500 });
    }
}