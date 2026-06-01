import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { VPSServer } from "@/lib/models";
import { vf } from "@/lib/virtfusion";
import { getAwsClients, fetchCpuUtilization } from "@/lib/aws";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

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

    if (!server) return new NextResponse("Not Found", { status: 404 });

    if (!isCloud) {
        const details = await vf.getServer(server.virtfusionId);
        if (!details) return new NextResponse("Error fetching details", { status: 502 });
        return NextResponse.json(details);
    } else {
        try {
            const { ec2 } = getAwsClients(server.region);
            const cmd = new DescribeInstancesCommand({ InstanceIds: [server.instanceId] });
            const res = await ec2.send(cmd);
            
            const instance = res.Reservations?.[0]?.Instances?.[0];
            const isRunning = instance?.State?.Name === 'running';
            const cpuStat = await fetchCpuUtilization(server.region, server.instanceId);

            // Mock VirtFusion structure
            const data = {
                name: server.name,
                hostname: instance?.PrivateDnsName || server.instanceId,
                state: {
                    status: isRunning ? 'running' : 'offline',
                    running: isRunning,
                    cpu: `${cpuStat || 0} %`,
                    network: {
                        primary: {
                            traffic: { rx: 0, tx: 0, total: 0 }
                        }
                    }
                },
                network: {
                    primary: {
                        ipv4: [{ address: instance?.PublicIpAddress || server.ip || 'Pending' }],
                        limit: 'Unlimited'
                    }
                }
            };
            return NextResponse.json(data);
        } catch (e: any) {
            console.error("AWS Stats Error:", e);
            return new NextResponse(e.message, { status: 500 });
        }
    }
}

