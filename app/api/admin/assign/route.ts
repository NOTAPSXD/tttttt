import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { vf } from "@/lib/virtfusion";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    try {
        await connectDB();
        const { virtfusionId, userId } = await req.json();

        if (!virtfusionId || !userId) return new NextResponse("Missing fields", { status: 400 });

        // NoSQL Injection protection: Force string types
        const safeVirtfusionId = String(virtfusionId);
        const safeUserId = String(userId);

        // Fetch details from VF to ensure freshness and valid ID
        const details = await vf.getServer(safeVirtfusionId);
        if (!details) return new NextResponse("Invalid VirtFusion ID", { status: 404 });

        const name = details.name || "Unknown Server";
        const ip = details.network?.primary?.ipv4?.[0]?.address || "";

        // Upsert: Create if new, Update owner if existing
        let server = await Server.findOne({ virtfusionId: safeVirtfusionId });

        if (server) {
            server.userId = safeUserId;
            server.name = name;
            server.ip = ip;
            await server.save();
        } else {
            server = await Server.create({
                virtfusionId: safeVirtfusionId,
                userId: safeUserId,
                name,
                ip,
                status: "UNKNOWN"
            });
        }

        return NextResponse.json({
            ...server.toObject(),
            id: server._id.toString()
        });
    } catch (e) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
