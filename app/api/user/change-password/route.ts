import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    await connectDB();
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) return new NextResponse("User not found", { status: 404 });

    // If user has a password set (they should), verify it
    if (user.password) {
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(session.user.id, { password: hashed });

    return NextResponse.json({ success: true });
}
