import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, EmailLog } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectDB();
        const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(100);
        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json([]);
    }
}
