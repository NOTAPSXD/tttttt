import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, VPSServer, IServer, IVPSServer } from "@/lib/db";
import { vf } from "@/lib/virtfusion";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    const query = session.user.role === 'ADMIN'
        ? { _id: id }
        : { _id: id, userId: session.user.id };

    let server: IServer | IVPSServer | null = await Server.findOne(query);
    let isCloud = false;

    if (!server) {
        server = await VPSServer.findOne(query);
        isCloud = true;
    }

    if (!server) return new NextResponse("Not Found", { status: 404 });

    if (isCloud) {
        return NextResponse.json([]);
    }

    try {
        const data = await vf.getTasks((server as IServer).virtfusionId);
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch tasks";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
