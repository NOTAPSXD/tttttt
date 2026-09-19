import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAudit, notifyUser } from "@/lib/audit";
import { parseBody, changePasswordSchema } from "@/lib/validation";
import { revokeAllUserSessions } from "@/lib/sessions";

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