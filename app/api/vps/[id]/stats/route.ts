import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { getAdapterForServer } from "@/lib/providers";
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

    const adapter = getAdapterForServer(server);

    try {
        // Prefer the raw VirtFusion payload so the legacy client UI keeps
        // reading network/state shapes unchanged; manual hosts fall back to
        // a synthesized payload from the DB record + health state.
        const raw = await adapter.getUpstream(server.providerServerId);
        const state = await adapter.getState(server.providerServerId);

        if (raw) {
            return NextResponse.json(raw);
        }

        return NextResponse.json({
            name: server.name,
            hostname: server.hostname || null,
            memory: server.ram || null,
            cpu: server.cpu || null,
            state: state
                ? {
                    status: state.status,
                    running: state.running,
                    cpu: `${state.cpuPct} %`,
                    memory: state.memUsedMb ? `${state.memUsedMb} MB` : "0 MB",
                    network: {
                        primary: {
                            traffic: { rx: state.traffic.rx, tx: state.traffic.tx, total: state.traffic.total },
                        },
                    },
                }
                : null,
            network: {
                primary: { ipv4: server.ip ? [{ address: server.ip }] : [], limit: null },
            },
        });
    } catch (e) {
        console.error("stats error:", e);
        return NextResponse.json({ error: "Failed to fetch server statistics" }, { status: 502 });
    }
}