import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { getAdapterForServer, getCapabilities } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    await connectDB();

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return new NextResponse("Not Found", { status: 404 });

    const caps = await getCapabilities(server.providerType).catch(() => null);
    if (caps && !caps.tasks) return NextResponse.json([]);

    try {
        const adapter = getAdapterForServer(server);
        const data = await adapter.getTasks(server.providerServerId);
        return NextResponse.json(data ?? []);
    } catch (e) {
        console.error("tasks error:", e);
        return NextResponse.json([], { status: 200 });
    }
}