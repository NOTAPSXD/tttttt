import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: "Missing password" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    await connectDB();
    await User.findByIdAndUpdate(id, { password: hashed });
    return NextResponse.json({ success: true });
}
