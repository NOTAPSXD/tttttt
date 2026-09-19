import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { assignServer } from "@/lib/ownership";
import { getAdapter } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { parseBody, assignSchema } from "@/lib/validation";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    try {
        await connectDB();
        const parsed = await parseBody(req, assignSchema);
        if (!parsed.ok) return new NextResponse(parsed.error, { status: 400 });
        const { providerServerId, virtfusionId, userId, reason, notify } = parsed.data;

        const resolvedId = providerServerId || virtfusionId;
        if (!resolvedId) return new NextResponse("Missing server id", { status: 400 });

        // Look up the server record first; if it isn't mapped yet, create it
        // from the provider catalog so assignments work for brand-new assets.
        let server = await Server.findOne({ providerServerId: resolvedId });
        if (!server) {
            const adapter = getAdapter("virtfusion");
            const upstream = await adapter.getUpstream(resolvedId);
            if (!upstream) return new NextResponse("Server not found on the provider", { status: 404 });

            const name = upstream.name || "Unknown Server";
            const ip = upstream.network?.primary?.ipv4?.[0]?.address || upstream.network?.primary?.ipv4?.[0] || "";
            server = await Server.create({
                providerServerId: resolvedId,
                providerType: "virtfusion",
                name: String(name),
                ip,
                ipLower: ip ? String(ip).toLowerCase() : undefined,
                status: upstream.state?.running === true ? "RUNNING" : "UNKNOWN",
                ownerId: null,
            });
        }

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        const result = await assignServer({
            serverId: String(server._id),
            toUserId: userId,
            actor: { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            reason,
            ip,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        if (notify) {
            // In-app notification is always written by the ownership service;
            // this flag only controls the additional "server assigned" message
            // accuracy, so it is a no-op for now.
        }

        return NextResponse.json({
            success: true,
            status: result.status,
            server: {
                id: result.serverId,
                ownerId: result.ownerId,
            },
        });
    } catch (e) {
        console.error("assign error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}