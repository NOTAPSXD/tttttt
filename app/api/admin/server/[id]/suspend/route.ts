import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, Notification, Log } from "@/lib/db";

// Suspend a server (admin only)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectDB();
        const server = await Server.findById(id);

        if (!server) {
            return new NextResponse("Server not found", { status: 404 });
        }

        const updated = await Server.findByIdAndUpdate(
            id,
            { suspended: true },
            { new: true }
        );

        // Notify user
        if (server.userId) {
            await Notification.create({
                userId: server.userId,
                title: "Service Suspended",
                message: `Your server "${server.name}" has been suspended. Please contact support.`,
                read: false
            });
        }

        // Log action
        await Log.create({
            userId: session.user.id,
            action: 'SERVER_SUSPENDED',
            details: `Suspended server: ${server.name} (${id})`
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to suspend server" }, { status: 500 });
    }
}

// Unsuspend a server
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectDB();
        const server = await Server.findById(id);

        if (!server) {
            return new NextResponse("Server not found", { status: 404 });
        }

        const updated = await Server.findByIdAndUpdate(
            id,
            { suspended: false },
            { new: true }
        );

        // Notify user
        if (server.userId) {
            await Notification.create({
                userId: server.userId,
                title: "Service Restored",
                message: `Your server "${server.name}" has been restored and is now active.`,
                read: false
            });
        }

        // Log action
        await Log.create({
            userId: session.user.id,
            action: 'SERVER_UNSUSPENDED',
            details: `Unsuspended server: ${server.name} (${id})`
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to unsuspend server" }, { status: 500 });
    }
}
