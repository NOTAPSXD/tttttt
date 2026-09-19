import { NextResponse } from "next/server";
import { connectDB, User, PasswordResetToken } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { parseBody, resetPasswordSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

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

        // Atomically consume the token so it is strictly single-use.
        const resetToken = await PasswordResetToken.findOneAndUpdate(
            { token: parsed.data.token, used: false, expiresAt: { $gt: new Date() } },
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
            sendEmail(
                user.email,
                "Your password was changed - VexaNode",
                `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                    <div style="background: #0f172a; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Password Changed</h2>
                    </div>
                    <div style="padding: 30px; background: white; color: #334155;">
                        <p>Hello <b>${user.name}</b>,</p>
                        <p>Your password was changed using a reset link. If this was you, no action is needed. If you did not request this, contact support immediately.</p>
                    </div>
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