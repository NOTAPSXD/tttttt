import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { revokeSessionById } from "@/lib/sessions";
import { isValidObjectId } from "mongoose";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const rl = await rateLimit(`sessions_revoke_${session.user.id}`, 10, 60000);
    if (!rl.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
        return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    try {
        const revoked = await revokeSessionById(session.user.id, id);
        if (!revoked) {
            return NextResponse.json({ error: "Session not found or already ended" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("session revoke error:", e);
        return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
    }
}