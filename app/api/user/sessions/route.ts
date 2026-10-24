import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { listUserSessions } from "@/lib/sessions";

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