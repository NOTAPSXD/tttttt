import { NextResponse } from "next/server";
import { connectDB, User, PasswordResetToken } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { parseBody, resetPasswordSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { revokeAllUserSessions } from "@/lib/sessions";

export async function POST(req: Request) {
    const parsed = await parseBody(req, resetPasswordSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    try {
        await connectDB();

        // Rate limit reset attempts by IP (5 per 10 minutes).
        const rl = await rateLimit(`reset_${ip}`, 5, 600000);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many reset attempts. Please wait before trying again." },
                { status: 429 }
            );
        }

        // F-009: Hash the incoming raw token and atomically consume it.
        // Also supports unhashed fallback for in-flight tokens during rollout.
        const crypto = await import("crypto");
        const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");

        const resetToken = await PasswordResetToken.findOneAndUpdate(
            {
                $or: [{ token: tokenHash }, { token: parsed.data.token }],
                used: false,
                expiresAt: { $gt: new Date() },
            },
            { $set: { used: true } },
            { new: true }
        );

        if (!resetToken) {
            return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
        }

        const hashed = await bcrypt.hash(parsed.data.password, 10);
        const user = await User.findByIdAndUpdate(resetToken.userId, { password: hashed });

        if (user) {
            // Escalating a possibly-compromised account: notify the owner.
            revokeAllUserSessions(String(resetToken.userId)).catch(() => {});
            // Escalating a possibly-compromised account: notify the owner.
            sendEmail(
                user.email,
                "Security Notice: Your VexaNode account password was changed",
                `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0c10; color: #e6e8ec; border: 1px solid #1f242d; border-radius: 8px;">
                    <div style="margin-bottom: 20px; border-bottom: 1px solid #1f242d; padding-bottom: 16px;">
                        <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">VEXANODE</span>
                    </div>
                    <h2 style="font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0;">Password Reset Completed</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        Hello <b style="color: #e6e8ec;">${user.name}</b>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        Your password was successfully changed using a password reset link. All other active sessions have been invalidated.
                    </p>
                    <div style="margin: 24px 0; padding: 14px; background: #11141a; border: 1px solid #1f242d; border-radius: 6px;">
                        <p style="margin: 0; font-size: 13px; color: #8b93a1;">
                            <strong style="color: #e6e8ec;">Time:</strong> ${new Date().toUTCString()}<br/>
                            <strong style="color: #e6e8ec;">Method:</strong> Password Reset Token
                        </p>
                    </div>
                    <p style="font-size: 13px; line-height: 1.6; color: #ef4444;">
                        <strong>Did not request this?</strong> If you did not reset your password, contact support immediately.
                    </p>
                </div>
                `,
                "SYSTEM",
                "Your VexaNode password was changed using a reset link. If this wasn't you, contact support immediately."
            ).catch(() => {});
        }

        // Existing sessions are invalidated automatically: the JWT callback
        // compares stored password hashes on every request.

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }
}