import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    try {
        const users = await User.find({}, { name: 1, email: 1, _id: 1, role: 1 }).sort({ name: 1 });
        return NextResponse.json(users);
    } catch (e) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    const { name, email, password, role } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({
            name: name || email.split('@')[0],
            email,
            password: hashed,
            role: role || "CLIENT"
        });
        return NextResponse.json(user);
    } catch (e) {
        return NextResponse.json({ error: "Email likely exists" }, { status: 400 });
    }
}
