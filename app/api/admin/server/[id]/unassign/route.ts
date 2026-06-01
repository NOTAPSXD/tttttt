import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    try {
        await connectDB();
        await Server.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
    }
}
