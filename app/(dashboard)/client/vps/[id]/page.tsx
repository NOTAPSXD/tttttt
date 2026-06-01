import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { VPSServer } from "@/lib/models";
import { isValidObjectId } from "mongoose";
import { vf } from "@/lib/virtfusion";
import { getAwsClients, fetchCpuUtilization } from "@/lib/aws";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { redirect, notFound } from "next/navigation";
import ServerControl from "@/app/components/ServerControl";

export default async function VPSDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    // Verify ownership
    let server: any = null;
    let isCloud = false;

    try {
        if (!isValidObjectId(id)) {
            notFound();
        }

        await connectDB();
        let serverDoc: any = await Server.findOne({
            _id: id,
            userId: session.user.id
        }).lean();

        if (serverDoc) {
            server = { ...serverDoc, id: serverDoc._id.toString() };
        } else {
            serverDoc = await VPSServer.findOne({
                _id: id,
                userId: session.user.id
            }).lean();
            if (serverDoc) {
                server = { ...serverDoc, id: serverDoc._id.toString() };
                isCloud = true;
            }
        }
    } catch (e) {
        console.error(e);
        return <div>Database Error</div>;
    }

    if (!server) notFound();

    let initialData: any = {};

    if (!isCloud) {
        // Initial Fetch
        const vfDetails = await vf.getServer(server.virtfusionId);

        if (!vfDetails) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-500">API Error</h1>
                    <p className="text-gray-400">Could not fetch server details from the virtual server platform.</p>
                </div>
            )
        }

        // Merge names
        initialData = { ...vfDetails, name: server.name };
    } else {
        try {
            const { ec2 } = getAwsClients(server.region);
            const cmd = new DescribeInstancesCommand({ InstanceIds: [server.instanceId] });
            const res = await ec2.send(cmd);
            
            const instance = res.Reservations?.[0]?.Instances?.[0];
            const isRunning = instance?.State?.Name === 'running';
            const cpuMatch = server.cpu?.match(/\d+/) || ["2"];
            const ramMatch = server.ram?.match(/\d+/) || ["2048"];
            const cpuCores = parseInt(cpuMatch[0]);
            const ramMB = parseInt(ramMatch[0]);
            
            const cpuStat = await fetchCpuUtilization(server.region, server.instanceId);

            initialData = {
                name: server.name,
                hostname: instance?.PrivateDnsName || server.instanceId,
                memory: `${ramMB} MB`,
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
                storage: [{ capacity: '20 GB', primary: true }],
                network: {
                    primary: {
                        ipv4: [{ address: instance?.PublicIpAddress || server.ip || 'Pending' }],
                        limit: 'Unlimited'
                    }
                }
            };
        } catch (e) {
            console.error(e);
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-500">API Error</h1>
                    <p className="text-gray-400">Could not fetch server details from Cloud Provider.</p>
                </div>
            )
        }
    }

    return <ServerControl initialVfData={initialData} serverId={server.id} />;
}
