import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Notification } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const notifications = await Notification.find({
            userId: session.user.id
        }).sort({ createdAt: -1 });

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
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { title, message, userId } = await request.json();

        // Note: type is not in current schema, so we only store title/message
        const notification = await Notification.create({
            userId: userId || session.user.id,
            title,
            message,
            read: false,
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("Create notification error:", error);
        return NextResponse.json(
            { error: "Failed to create notification" },
            { status: 500 }
        );
    }
}
