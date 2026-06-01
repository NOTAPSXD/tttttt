import { NextResponse } from "next/server";
import { connectDB, User, PasswordResetToken } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        await connectDB();
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // Find valid token
        const resetToken = await PasswordResetToken.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!resetToken) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 10);

        // Update user and delete token
        // Note: Sequential operations instead of transaction for simplicity
        // If strict atomicity is required, use MongoDB sessions
        await User.findByIdAndUpdate(resetToken.userId, { password: hashed });
        await PasswordResetToken.findByIdAndDelete(resetToken._id);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }
}
