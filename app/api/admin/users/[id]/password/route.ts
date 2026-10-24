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
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2>Security Notice</h2>
                <p>Hello <b>${targetUser.name}</b>,</p>
                <p>Your VexaNode account password was recently reset by an administrator.</p>
                <p>All active sessions have been invalidated. If you did not authorize this change, please contact platform security immediately.</p>
            </div>
            `,
            session.user.email || "SECURITY"
        ).catch(() => {});
    }

    return NextResponse.json({ success: true });
}
