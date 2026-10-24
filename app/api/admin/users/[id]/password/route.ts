import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { isAdmin } from "@/lib/permissions";
import { parseBody, setPasswordSchema } from "@/lib/validation";
import { revokeAllUserSessions } from "@/lib/sessions";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const callerRole = String(session?.user?.role || "");

    if (!session?.user || !isAdmin(callerRole)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    const parsed = await parseBody(req, setPasswordSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { password } = parsed.data;

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // F-005: SUPER_ADMIN required when the target is an ADMIN or SUPER_ADMIN
    const isTargetElevated = targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN";
    if (isTargetElevated && callerRole !== "SUPER_ADMIN") {
        return NextResponse.json(
            { error: "SUPER_ADMIN privilege is required to reset passwords on administrator accounts." },
            { status: 403 }
        );
    }

    const hashed = await bcrypt.hash(password, 10);
    targetUser.password = hashed;
    await targetUser.save();

    // Invalidate all active sessions for the target user immediately
    revokeAllUserSessions(id).catch(() => {});

    // Notify the victim about administrative password reset
    if (targetUser.email) {
        sendEmail(
            targetUser.email,
            "Security Alert: Your account password was changed by an administrator",
            `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0c10; color: #e6e8ec; border: 1px solid #1f242d; border-radius: 8px;">
                <div style="margin-bottom: 20px; border-bottom: 1px solid #1f242d; padding-bottom: 16px;">
                    <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">VEXANODE</span>
                </div>
                <h2 style="font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0;">Security Alert: Administrative Password Reset</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                    Hello <b style="color: #e6e8ec;">${targetUser.name || targetUser.email}</b>,
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                    Your VexaNode account password was recently changed by an administrator. All active sessions have been invalidated immediately.
                </p>
                <div style="margin: 24px 0; padding: 14px; background: #11141a; border: 1px solid #1f242d; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #8b93a1;">
                        <strong style="color: #e6e8ec;">Time:</strong> ${new Date().toUTCString()}<br/>
                        <strong style="color: #e6e8ec;">Performed by:</strong> Administrative Staff
                    </p>
                </div>
                <p style="font-size: 13px; line-height: 1.6; color: #ef4444;">
                    If you did not request or authorize this change, please contact platform security immediately.
                </p>
            </div>
            `,
            session.user.email || "SECURITY"
        ).catch(() => {});
    }

    return NextResponse.json({ success: true });
}
