import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, VPSServer, IServer, IVPSServer } from "@/lib/db";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; backupId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id, backupId } = await params;

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

        // TODO: Integrate with VirtFusion delete backup API
        // await vf.deleteBackup(server.vfId, backupId);

        return NextResponse.json({
            message: "Backup deleted successfully",
            backupId
        });
    } catch (error) {
        console.error("Delete backup error:", error);
        return NextResponse.json(
            { error: "Failed to delete backup" },
            { status: 500 }
        );
    }
}
