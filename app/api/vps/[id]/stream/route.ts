import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { getAdapterForServer } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { providerStateFromVfRaw } from "@/lib/status";

export const dynamic = "force-dynamic";

async function buildPayload(server: any) {
    const adapter = getAdapterForServer(server);

    if (server.providerType === "manual") {
        // Manual host: synthesize a legacy-shaped payload the control panel
        // can render; live stats come from the health probe.
        let state: any = null;
        try {
            const s = await adapter.getState(server.providerServerId);
            if (s) {
                state = {
                    status: s.status,
                    running: s.running,
                    cpu: `${s.cpuPct} %`,
                    memory: s.memUsedMb ? `${s.memUsedMb} MB` : "0 MB",
                    network: { primary: { traffic: s.traffic } },
                };
            }
        } catch {
            state = null;
        }
        return {
            name: server.name,
            hostname: server.hostname || null,
            memory: server.ram || null,
            cpu: server.cpu || null,
            state,
            network: { primary: { ipv4: server.ip ? [{ address: server.ip }] : [], limit: null } },
        };
    }

    const raw = await adapter.getUpstream(server.providerServerId);
    if (raw) return raw;

    // Provider unreachable but we still have a cached record.
    const cached = providerStateFromVfRaw(null);
    return {
        name: server.name,
        hostname: server.hostname || null,
        memory: server.ram || null,
        cpu: server.cpu || null,
        state: cached,
        network: { primary: { ipv4: server.ip ? [{ address: server.ip }] : [], limit: null } },
    };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return new Response("Not Found", { status: 404 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    /* controller closed */
                }
            };

            // Initial send
            try {
                const payload = await buildPayload(server);
                send({ ...payload, _provider: server.providerType });
            } catch (e) {
                console.error("Stream initial fetch failed:", e);
            }

            const interval = setInterval(async () => {
                try {
                    const payload = await buildPayload(server);
                    send({ ...payload, _provider: server.providerType });
                } catch (e) {
                    console.error("Stream error:", e);
                }
            }, 3000);

            req.signal.addEventListener("abort", () => {
                clearInterval(interval);
                try {
                    controller.close();
                } catch {
                    /* already closed */
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}