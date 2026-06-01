import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, VPSServer, IServer, IVPSServer } from "@/lib/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Verify server ownership
        const query = session.user.role === 'ADMIN'
            ? { _id: id }
            : { _id: id, userId: session.user.id };

        let server: IServer | IVPSServer | null = await Server.findOne(query);
        let isCloud = false;

        if (!server) {
            server = await VPSServer.findOne(query);
            isCloud = true;
        }

        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 });
        }

        // Mock backup data - replace with actual VirtFusion API call
        const mockBackups = [
            {
                id: "backup-1",
                name: `Backup ${new Date().toLocaleDateString()}`,
                size: "2.4 GB",
                createdAt: new Date(),
                status: "completed"
            },
            {
                id: "backup-2",
                name: `Backup ${new Date(Date.now() - 86400000).toLocaleDateString()}`,
                size: "2.3 GB",
                createdAt: new Date(Date.now() - 86400000),
                status: "completed"
            }
        ];

        return NextResponse.json(mockBackups);
    } catch (error) {
        console.error("Fetch backups error:", error);
        return NextResponse.json(
            { error: "Failed to fetch backups" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Verify server ownership
        const query = session.user.role === 'ADMIN'
            ? { _id: id }
            : { _id: id, userId: session.user.id };

        let server: IServer | IVPSServer | null = await Server.findOne(query);
        let isCloud = false;

        if (!server) {
            server = await VPSServer.findOne(query);
            isCloud = true;
        }

        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 });
        }

        // TODO: Integrate with VirtFusion backup API
        // const backup = await vf.createBackup(server.vfId);

        return NextResponse.json({
            message: "Backup creation initiated",
            backup: {
                id: `backup-${Date.now()}`,
                name: `Backup ${new Date().toLocaleDateString()}`,
                status: "in_progress"
            }
        });
    } catch (error) {
        console.error("Create backup error:", error);
        return NextResponse.json(
            { error: "Failed to create backup" },
            { status: 500 }
        );
    }
}
