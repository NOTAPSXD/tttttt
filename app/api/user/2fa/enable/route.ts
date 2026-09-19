import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { hashHex } from "@/lib/crypto";
import { verifyTotp, generateRecoveryCodes } from "@/lib/otp";
import { parseBody, enableTwoFaSchema } from "@/lib/validation";
import { logAudit, notifyUser } from "@/lib/audit";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const parsed = await parseBody(req, enableTwoFaSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        await connectDB();
        const userId = String(session.user.id);
        const user = await User.findById(userId);
        if (!user) return new NextResponse("User not found", { status: 404 });

        if (user.twoFactor?.enabled) {
            return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 400 });
        }

        const pendingEnc = user.twoFactor?.pendingSecretEnc;
        if (!pendingEnc) {
            return NextResponse.json({ error: "Start a 2FA setup first." }, { status: 400 });
        }

        let pendingSecret = "";
        try {
            const { decryptSecret } = await import("@/lib/crypto");
            pendingSecret = decryptSecret(pendingEnc);
        } catch {
            return NextResponse.json({ error: "Could not read the pending secret." }, { status: 500 });
        }

        if (!verifyTotp(pendingSecret, parsed.data.code)) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        const recoveryCodes = generateRecoveryCodes();
        const recoveryHashes = recoveryCodes.map((c) => hashHex(c));

        user.twoFactor = {
            enabled: true,
            secretEnc: pendingEnc,
            pendingSecretEnc: null,
            recoveryHashes,
        };
        await user.save();

        logAudit(
            { id: userId, role: String(session.user.role ?? ""), email: session.user.email ?? undefined },
            "2FA_ENABLED",
            { id: userId, type: "User" }
        ).catch(() => {});
        notifyUser(userId, "security", "Two-factor authentication enabled.", {
            type: "success",
            link: "/client/settings",
        }).catch(() => {});

        return NextResponse.json({ success: true, recoveryCodes });
    } catch (e) {
        console.error("2fa enable error:", e);
        return NextResponse.json({ error: "Failed to enable two-factor authentication" }, { status: 500 });
    }
}