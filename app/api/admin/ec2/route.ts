import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchAndSyncInventory } from "@/lib/aws";
import { User } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        
        // Fetch inventory
        const inventory = await fetchAndSyncInventory();
        
        // Populate user data for assigned instances
        const userIds = inventory.map(i => i.userId).filter(Boolean);
        const users = await User.find({ _id: { $in: userIds } }, 'name email');
        const userMap = new Map(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

        const enrichedInventory = inventory.map(instance => ({
            ...instance,
            user: instance.userId ? userMap.get(instance.userId) : null
        }));

        return NextResponse.json(enrichedInventory);
    } catch (error: any) {
        console.error("EC2 Inventory API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
