import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { verifyTotp, consumeRecoveryCode, storedTotpSecret } from "@/lib/otp";
import { parseBody, disableTwoFaSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, notifyUser } from "@/lib/audit";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const parsed = await parseBody(req, disableTwoFaSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        await connectDB();
        const userId = String(session.user.id);
        const user = await User.findById(userId);
        if (!user) return new NextResponse("User not found", { status: 404 });

        if (!user.twoFactor?.enabled) {
            return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
        }

        // Guard against TOTP brute force on the disable flow.
        const rl = await rateLimit(`2fa_disable_${userId}`, 5, 300000);
        if (!rl.success) {
            return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
        }

        const secret = storedTotpSecret(user);
        const code = parsed.data.code;
        const totpOk = !!secret && verifyTotp(secret, code);
        const recoveryOk = totpOk ? false : await consumeRecoveryCode(user, code);
        if (!totpOk && !recoveryOk) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        user.twoFactor = {
            enabled: false,
            secretEnc: null,
            pendingSecretEnc: null,
            recoveryHashes: [],
        };
        await user.save();

        logAudit(
            { id: userId, role: String(session.user.role ?? ""), email: session.user.email ?? undefined },
            "2FA_DISABLED",
            { id: userId, type: "User" }
        ).catch(() => {});
        notifyUser(userId, "security", "Two-factor authentication disabled.", {
            type: "warning",
            link: "/client/settings",
        }).catch(() => {});

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("2fa disable error:", e);
        return NextResponse.json({ error: "Failed to disable two-factor authentication" }, { status: 500 });
    }
}