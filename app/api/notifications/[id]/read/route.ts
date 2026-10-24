import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Mock notification store
let notifications: any[] = [];

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notificationIndex = notifications.findIndex(
            n => n.id === params.id && n.userId === session.user.id
        );

        if (notificationIndex === -1) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        notifications[notificationIndex].read = true;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mark as read error:", error);
        return NextResponse.json(
            { error: "Failed to mark notification as read" },
            { status: 500 }
        );
    }
}
