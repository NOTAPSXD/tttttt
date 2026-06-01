import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { VPSServer } from "@/lib/models";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { instanceId, userId, name, region, publicIp, instanceType } = body;

        if (!instanceId || !region) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // NoSQL Injection protection: Force string types
        const safeInstanceId = String(instanceId);
        const safeUserId = userId ? String(userId) : null;
        const safeRegion = String(region);
        const safeName = name ? String(name) : safeInstanceId;
        const safeIp = publicIp ? String(publicIp) : null;
        const safeCpu = instanceType ? String(instanceType) : null;

        if (safeUserId) {
            // Assigning to user
            await VPSServer.findOneAndUpdate(
                { instanceId: safeInstanceId },
                {
                    instanceId: safeInstanceId,
                    userId: safeUserId,
                    name: safeName,
                    region: safeRegion,
                    ip: safeIp,
                    cpu: safeCpu,
                    status: 'ACTIVE'
                },
                { upsert: true, new: true }
            );
        } else {
            // Unassigning
            await VPSServer.findOneAndDelete({ instanceId: safeInstanceId });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("EC2 Assign API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
