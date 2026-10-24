import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Notification } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const notifications = await Notification.find({
            userId: session.user.id
        }).sort({ createdAt: -1 }).limit(50);

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        if (!body || typeof body.title !== "string" || typeof body.message !== "string") {
            return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
        }

        const title = body.title.trim().slice(0, 200);
        const message = body.message.trim().slice(0, 2000);
        if (!title || !message) {
            return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
        }

        // F-008: IDOR protection — only administrators can push notifications to other users.
        // Regular clients can strictly only create notifications for themselves.
        const isCallerAdmin = isAdmin(String(session.user.role || ""));
        const targetUserId = (isCallerAdmin && typeof body.userId === "string" && body.userId.trim())
            ? body.userId.trim()
            : String(session.user.id);

        await connectDB();
        const notification = await Notification.create({
            userId: targetUserId,
            title,
            message,
            read: false,
        });

        return NextResponse.json(notification, { status: 201 });
    } catch (error) {
        console.error("Create notification error:", error);
        return NextResponse.json(
            { error: "Failed to create notification" },
            { status: 500 }
        );
    }
}
