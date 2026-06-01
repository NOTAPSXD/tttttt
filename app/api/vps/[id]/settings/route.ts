import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, VPSServer, IServer, IVPSServer } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const { name } = await req.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (name.length > 50) {
            return NextResponse.json({ error: "Name too long (max 50 characters)" }, { status: 400 });
        }

        // Find the server
        let server: IServer | IVPSServer | null = await Server.findById(id);
        let isCloud = false;

        if (!server) {
            server = await VPSServer.findById(id);
            isCloud = true;
        }

        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 });
        }

        // Check ownership (clients can only modify their own servers)
        if (session.user.role !== "ADMIN" && server.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update the server name in DB
        let updatedServer;
        if (isCloud) {
            updatedServer = await VPSServer.findByIdAndUpdate(
                id,
                { name: name.trim() },
                { new: true }
            );
        } else {
            updatedServer = await Server.findByIdAndUpdate(
                id,
                { name: name.trim() },
                { new: true }
            );
        }

        return NextResponse.json({
            success: true,
            server: updatedServer
        });

    } catch (error) {
        console.error("Error updating settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
