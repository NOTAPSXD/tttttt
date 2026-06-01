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
        return new NextResponse(
            "<html><body style='background:#050505;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;'><div>VNC Console is not available for Cloud instances.</div></body></html>",
            { headers: { "Content-Type": "text/html" } }
        );
    }

    try {
        const vncData = await vf.getVNC((server as IServer).virtfusionId);

        if (!vncData || !vncData.wss || !vncData.wss.url) {
            return new NextResponse("VNC Request Failed or Not Ready", { status: 400 });
        }


        const apiUrl = process.env.VIRTFUSION_API_URL || "";
        let baseUrl = apiUrl;

        try {
            const urlObj = new URL(apiUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
            // Fallback or keep as is if invalid
        }

        // vncData.wss.url might be relative "/vnc/..." or absolute
        const targetUrl = vncData.wss.url.startsWith("http")
            ? vncData.wss.url
            : `${baseUrl}${vncData.wss.url}`;

        return NextResponse.redirect(targetUrl);

    } catch (error) {
        console.error("VNC Error:", error);
        return NextResponse.json({ error: "Failed to get VNC session" }, { status: 500 });
    }
}
