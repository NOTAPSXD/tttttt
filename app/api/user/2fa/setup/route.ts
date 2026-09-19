import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { generateTotpSecret, totpProvisioningUri } from "@/lib/otp";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: new NextResponse("Unauthorized", { status: 401 }) };
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return { error: new NextResponse("User not found", { status: 404 }) };
    return { user, id: String(session.user.id) };
}

export async function POST() {
    const out = await requireUser();
    if ("error" in out) return out.error;
    const { user } = out;

    if (user.twoFactor?.enabled) {
        return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 400 });
    }

    const secret = generateTotpSecret();
    user.twoFactor = {
        enabled: false,
        secretEnc: null,
        pendingSecretEnc: encryptSecret(secret),
        recoveryHashes: [],
    };
    await user.save();

    const otpauthUrl = totpProvisioningUri(secret, user.email);

    return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
    });
}

export async function GET() {
    const out = await requireUser();
    if ("error" in out) return out.error;
    const { user } = out;
    return NextResponse.json({ enabled: user.twoFactor?.enabled === true });
}