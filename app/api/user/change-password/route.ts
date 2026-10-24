import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAudit, notifyUser } from "@/lib/audit";
import { parseBody, changePasswordSchema } from "@/lib/validation";
import { revokeAllUserSessions } from "@/lib/sessions";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const parsed = await parseBody(req, changePasswordSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        await connectDB();
        const userId = session.user.id;
        const user = await User.findById(userId);
        if (!user) return new NextResponse("User not found", { status: 404 });

        if (user.password) {
            const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
            if (!valid) {
                return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
            }
        }

        const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
        await User.findByIdAndUpdate(userId, { password: hashed });

        logAudit(
            { id: userId, role: String(session.user.role ?? ""), email: session.user.email ?? undefined },
            "PASSWORD_CHANGED",
            { id: userId, type: "User" }
        ).catch(() => {});
        notifyUser(String(userId), "security", "Your password was changed.", {
            type: "info",
            link: "/client/settings",
        }).catch(() => {});

        // Send email alert to user
        if (user.email) {
            sendEmail(
                user.email,
                "Security Notice: Your VexaNode account password was changed",
                `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0c10; color: #e6e8ec; border: 1px solid #1f242d; border-radius: 8px;">
                    <div style="margin-bottom: 20px; border-bottom: 1px solid #1f242d; padding-bottom: 16px;">
                        <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">VEXANODE</span>
                    </div>
                    <h2 style="font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0;">Password Changed Successfully</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        Hello <b style="color: #e6e8ec;">${user.name || user.email}</b>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        Your VexaNode account password was recently changed. All other active sessions on your devices have been signed out for your security.
                    </p>
                    <div style="margin: 24px 0; padding: 14px; background: #11141a; border: 1px solid #1f242d; border-radius: 6px;">
                        <p style="margin: 0; font-size: 13px; color: #8b93a1;">
                            <strong style="color: #e6e8ec;">Time:</strong> ${new Date().toUTCString()}<br/>
                            <strong style="color: #e6e8ec;">Action:</strong> User Password Update
                        </p>
                    </div>
                    <p style="font-size: 13px; line-height: 1.6; color: #ef4444;">
                        <strong>Did not make this change?</strong> If you did not change your password, your account may be compromised. Please contact support immediately.
                    </p>
                </div>
                `,
                "SECURITY",
                "Your VexaNode account password was recently changed. If you did not make this change, please contact support immediately."
            ).catch((err) => console.error("Failed to send password change email:", err));
        }

        // All sessions (including this one) self-invalidate on the next
        // request because the JWT callback compares the stored password hash.
        // Also explicitly end the tracked device sessions.
        revokeAllUserSessions(String(userId)).catch(() => {});
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("change-password error:", e);
        return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }
}