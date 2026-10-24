import { NextResponse } from "next/server";
import { connectDB, User, PasswordResetToken } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import { parseBody, forgotPasswordSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    const startTime = Date.now();
    const parsed = await parseBody(req, forgotPasswordSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        await connectDB();

        // Limit password-reset requests per email address (3 per 10 minutes).
        const rl = await rateLimit(`forgot_${parsed.data.email}`, 3, 600000);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many reset requests. Please wait before trying again." },
                { status: 429 }
            );
        }

        const user = await User.findOne({ emailLower: parsed.data.email });
        if (!user) {
            // F-009: Timing oracle mitigation — simulate processing delay to prevent account enumeration
            const elapsed = Date.now() - startTime;
            const targetDelay = 250;
            if (elapsed < targetDelay) {
                await new Promise((r) => setTimeout(r, targetDelay - elapsed));
            }
            return NextResponse.json({ success: true });
        }

        // F-009: Store SHA-256 hash in database; send raw token in email
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Invalidate prior unused tokens for this user
        await PasswordResetToken.updateMany(
            { userId: user._id.toString(), used: false },
            { $set: { used: true } }
        );

        await PasswordResetToken.create({
            token: tokenHash,
            userId: user._id.toString(),
            expiresAt,
        });

        const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:2004";
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

        // Fire non-blocking email delivery
        sendEmail(
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
            `
        ).catch((err) => console.error("Reset email delivery failed:", err));

        // Ensure normalized response timing
        const elapsed = Date.now() - startTime;
        const targetDelay = 250;
        if (elapsed < targetDelay) {
            await new Promise((r) => setTimeout(r, targetDelay - elapsed));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
