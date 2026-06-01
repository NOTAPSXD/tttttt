import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { VPSServer } from "@/lib/models";
import { vf } from "@/lib/virtfusion";
import { getAwsClients, fetchCpuUtilization } from "@/lib/aws";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const query = session.user.role === 'ADMIN'
        ? { _id: id }
        : { _id: id, userId: session.user.id };

    let server: any = await Server.findOne(query);
    let isCloud = false;

    if (!server) {
        server = await VPSServer.findOne(query);
        isCloud = true;
    }

    if (!server) return new Response("Not Found", { status: 404 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            if (isCloud) {
                const interval = setInterval(async () => {
                    try {
                        const { ec2 } = getAwsClients(server.region);
                        const cmd = new DescribeInstancesCommand({ InstanceIds: [server.instanceId] });
                        const res = await ec2.send(cmd);
                        const instance = res.Reservations?.[0]?.Instances?.[0];
                        const isRunning = instance?.State?.Name === 'running';
                        const cpuStat = await fetchCpuUtilization(server.region, server.instanceId);

                        const mappedData = {
                            name: server.name,
                            hostname: instance?.PrivateDnsName || server.instanceId,
                            memory: server.ram || '2048 MB',
                            state: {
                                status: isRunning ? 'running' : 'offline',
                                running: isRunning,
                                cpu: `${cpuStat || 0} %`,
                                network: {
                                    primary: { traffic: { rx: 0, tx: 0, total: 0 } }
                                }
                            },
                            storage: [{ capacity: server.disk || '20 GB', primary: true }],
                            network: {
                                primary: {
                                    ipv4: [{ address: instance?.PublicIpAddress || server.ip || 'Pending' }],
                                    limit: 'Unlimited'
                                }
                            }
                        };
                        send(mappedData);
                    } catch (e) {
                        console.error("Cloud stream error:", e);
                    }
                }, 5000); // 5s for cloud to avoid heavy AWS limits

                req.signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    controller.close();
                });
            } else {
                // Initial send
                const details = await vf.getServer(server.virtfusionId);
                if (details) send(details);

                const interval = setInterval(async () => {
                    try {
                        const latestDetails = await vf.getServer(server.virtfusionId);
                        if (latestDetails) {
                            send(latestDetails);
                        }
                    } catch (e) {
                        console.error("Stream error:", e);
                    }
                }, 3000);

                req.signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    controller.close();
                });
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
