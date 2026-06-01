import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { VPSServer } from "@/lib/models";
import { vf } from "@/lib/virtfusion";
import { getAwsClients } from "@/lib/aws";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();
        
        // Fetch VirtFusion Servers
        const dbServersData = await Server.find({
            userId: session.user.id
        }).lean();

        // Fetch Cloud Instances (EC2)
        const cloudServersData = await VPSServer.find({
            userId: session.user.id
        }).lean();

        const dbServers = JSON.parse(JSON.stringify(dbServersData));
        const cloudServers = JSON.parse(JSON.stringify(cloudServersData));

        let totalCpu = 0;
        let totalRam = 0;
        let runningServers = 0;

        // Process VirtFusion
        const vfServers = await Promise.all(dbServers.map(async (s: any) => {
            try {
                const vfDetails = await vf.getServer(s.virtfusionId);
                if (vfDetails?.state?.running) runningServers++;
                
                const cpuCores = parseInt(vfDetails?.cpu?.match(/\d+/)?.[0] || "0");
                const ramMB = parseInt(vfDetails?.memory?.match(/\d+/)?.[0] || "0");
                totalCpu += cpuCores;
                totalRam += ramMB;

                return { ...s, id: s._id, vfDetails };
            } catch (e) {
                return { ...s, id: s._id, vfDetails: null };
            }
        }));

        // Process Cloud Instances
        const mappedCloudServers = await Promise.all(cloudServers.map(async (cs: any) => {
            try {
                const { ec2 } = getAwsClients(cs.region);
                const cmd = new DescribeInstancesCommand({ InstanceIds: [cs.instanceId] });
                const res = await ec2.send(cmd);
                
                const instance = res.Reservations?.[0]?.Instances?.[0];
                const isRunning = instance?.State?.Name === 'running';
                
                if (isRunning) runningServers++;
                
                // Estimate CPU and RAM based on instance type, or use what is stored
                const cpuMatch = cs.cpu?.match(/\d+/) || ["2"];
                const ramMatch = cs.ram?.match(/\d+/) || ["2048"];
                const cpuCores = parseInt(cpuMatch[0]);
                const ramMB = parseInt(ramMatch[0]);
                
                totalCpu += cpuCores;
                totalRam += ramMB;

                return {
                    ...cs,
                    id: cs._id,
                    isCloudInstance: true,
                    ip: instance?.PublicIpAddress || cs.ip,
                    vfDetails: {
                        state: {
                            running: isRunning,
                            status: isRunning ? 'running' : 'offline'
                        },
                        cpu: `${cpuCores} vCores`,
                        memory: `${ramMB} MB`,
                        network: {
                            primary: {
                                ipv4: [{ address: instance?.PublicIpAddress || cs.ip }]
                            }
                        }
                    }
                };
            } catch (e) {
                return { 
                    ...cs, 
                    id: cs._id, 
                    isCloudInstance: true,
                    vfDetails: {
                        state: { running: false, status: 'unknown' },
                        cpu: cs.cpu || 'Unknown',
                        memory: cs.ram || 'Unknown',
                    }
                };
            }
        }));

        const allServers = [...vfServers, ...mappedCloudServers];

        return NextResponse.json({
            servers: allServers,
            totalCpu,
            totalRam,
            runningServers
        });
    } catch (e) {
        console.error("API Error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
