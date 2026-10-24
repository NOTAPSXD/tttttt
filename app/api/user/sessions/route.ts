import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { listUserSessions, revokeOtherUserSessions } from "@/lib/sessions";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const rl = await rateLimit(`sessions_list_${session.user.id}`, 30, 60000);
    if (!rl.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const currentHash =
            (session.user as { sessionHash?: string | null }).sessionHash || null;
        const sessions = await listUserSessions(session.user.id, currentHash);
        return NextResponse.json({ sessions });
    } catch (e) {
        console.error("sessions list error:", e);
        return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
    }
}

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const rl = await rateLimit(`sessions_revoke_all_${session.user.id}`, 10, 60000);
    if (!rl.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const currentHash =
            (session.user as { sessionHash?: string | null }).sessionHash || null;
        if (!currentHash) {
            return NextResponse.json({ error: "Active session identifier missing" }, { status: 400 });
        }

        const count = await revokeOtherUserSessions(session.user.id, currentHash);
        return NextResponse.json({ success: true, count });
    } catch (e) {
        console.error("sessions revoke others error:", e);
        return NextResponse.json({ error: "Failed to revoke other sessions" }, { status: 500 });
    }
}
