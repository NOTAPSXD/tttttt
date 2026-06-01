import { NextResponse } from "next/server";
import { connectDB, User, PasswordResetToken } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        await connectDB();
        const { email } = await req.json();

        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const user = await User.findOne({ email });
        if (!user) {
            // Fake success
            return NextResponse.json({ success: true });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordResetToken.create({
            token,
            userId: user._id,
            expiresAt
        });

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await sendEmail(
            user.email,
            "Reset Your Password - VexaNode",
            `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: #0f172a; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Password Reset</h2>
                </div>
                <div style="padding: 30px; background: white; color: #334155;">
                    <p>Hello <b>${user.name}</b>,</p>
                    <p>We received a request to reset your password. If this was you, please click the button below:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">Link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                </div>
            </div>
            `,
            "SYSTEM"
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
