import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { unassignServer } from "@/lib/ownership";
import { isAdmin } from "@/lib/permissions";
import { parseBody, unassignSchema } from "@/lib/validation";

/**
 * Soft unassign: detach ownership and close the active assignment. The server
 * record is NEVER deleted here — it remains an UNASSIGNED / available asset.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    try {
        await connectDB();
        const parsed = await parseBody(req, unassignSchema);
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
        const reason = parsed.data.reason || undefined;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

        const result = await unassignServer({
            serverId: id,
            actor: { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            reason,
            ip,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({ success: true, serverId: result.serverId });
    } catch (error) {
        console.error("unassign error:", error);
        return NextResponse.json({ error: "Failed to unassign server" }, { status: 500 });
    }
}