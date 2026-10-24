import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { getAdapterForServer, ProviderError } from "@/lib/providers";
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

    try {
        const adapter = getAdapterForServer(server);
        const vncData = await adapter.getVNC(server.providerServerId);

        if (!vncData?.url) {
            return new NextResponse("VNC Request Failed or Not Ready", { status: 400 });
        }

        const apiUrl = process.env.VIRTFUSION_API_URL || "";
        let baseUrl = apiUrl;
        try {
            const urlObj = new URL(apiUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch {
            // keep as-is if invalid
        }

        const targetUrl = vncData.url.startsWith("http") ? vncData.url : `${baseUrl}${vncData.url}`;
        return NextResponse.redirect(targetUrl);
    } catch (e) {
        if (e instanceof ProviderError) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }
        console.error("VNC Error:", e);
        return NextResponse.json({ error: "Failed to get VNC session" }, { status: 500 });
    }
}