/**
 * POST /api/auth/2fa-challenge
 *
 * Two-phase progressive 2FA flow that works alongside NextAuth credentials:
 *
 * Phase 1 — { action:"issue", email, password }
 *   Validates credentials. If user has 2FA enabled, issues a short-lived
 *   HMAC-signed challenge token (5 min TTL) and returns:
 *     { requires2fa: true, challengeToken: "<token>" }
 *   If 2FA is NOT enabled, returns:
 *     { requires2fa: false }
 *   so the client can call signIn() directly without an OTP.
 *
 * Phase 2 — { action:"verify", challengeToken, code }
 *   Verifies the HMAC token (expiry + signature), then verifies the TOTP
 *   code (or recovery code). On success the client calls signIn() with
 *   email + password + otp, completing the NextAuth flow normally.
 *
 *   Returns: { ok: true } or 4xx error.
 *
 * Security properties:
 *  - HMAC-SHA256 signed with CHALLENGE_SECRET (env); forged tokens are rejected
 *  - 5-minute expiry encoded in the token payload, re-checked server-side
 *  - Phase 1 uses the same rate limit key as NextAuth login to prevent bypass
 *  - Responses are identical for unknown vs known emails (enumeration-safe)
 *  - No stack traces exposed; all errors are generic
 *  - Both phases are rate-limited per IP + per email
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyTotp, consumeRecoveryCode, storedTotpSecret } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

// ── Token helpers ──────────────────────────────────────────────────────────

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function challengeSecret(): Buffer {
    const s = process.env.CHALLENGE_SECRET || process.env.NEXTAUTH_SECRET;
    if (!s) throw new Error("CHALLENGE_SECRET or NEXTAUTH_SECRET env var is required");
    return crypto.createHash("sha256").update(s).digest();
}

/**
 * Issue a signed token encoding { userId, exp }.
 * Format: base64url(payload) + "." + base64url(hmac)
 */
function issueChallenge(userId: string): string {
    const payload = Buffer.from(
        JSON.stringify({ uid: userId, exp: Date.now() + CHALLENGE_TTL_MS })
    ).toString("base64url");
    const sig = crypto
        .createHmac("sha256", challengeSecret())
        .update(payload)
        .digest("base64url");
    return `${payload}.${sig}`;
}

/**
 * Verify a challenge token. Returns the userId on success, throws on failure.
 */
function verifyChallenge(token: string): string {
    const dot = token.lastIndexOf(".");
    if (dot === -1) throw new Error("malformed");
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);

    // Constant-time signature comparison
    const expected = crypto
        .createHmac("sha256", challengeSecret())
        .update(payload)
        .digest("base64url");
    const sigBuf      = Buffer.from(sig,      "base64url");
    const expectedBuf = Buffer.from(expected, "base64url");
    if (
        sigBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
        throw new Error("invalid signature");
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
        throw new Error("expired");
    }
    return String(parsed.uid);
}

// ── Zod schemas ────────────────────────────────────────────────────────────

const issueSchema = z.object({
    action: z.literal("issue"),
    email: z.string().trim().toLowerCase().email().max(160),
    password: z.string().min(1).max(72),
});

const verifySchema = z.object({
    action: z.literal("verify"),
    challengeToken: z.string().min(10),
    code: z.string().trim().min(6).max(16),
});

const bodySchema = z.discriminatedUnion("action", [issueSchema, verifySchema]);

// ── Handler ────────────────────────────────────────────────────────────────

function clientIp(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function genericError(status = 400) {
    return NextResponse.json(
        { error: "Invalid email or password" },
        { status }
    );
}

export async function POST(req: Request) {
    // Global IP-level rate limit across both phases
    const ip = clientIp(req);
    const ipRl = await rateLimit(`2fa_challenge_ip_${ip}`, 20, 60_000);
    if (!ipRl.success) {
        return NextResponse.json(
            { error: "Too many requests. Please slow down." },
            { status: 429 }
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // ── Phase 1: issue ─────────────────────────────────────────────────────
    if (parsed.data.action === "issue") {
        const { email, password } = parsed.data;

        // Same rate limit key as NextAuth login — prevents bypassing it via this route
        const emailRl = await rateLimit(`login_${email}`, 5, 300_000);
        if (!emailRl.success) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again in 5 minutes." },
                { status: 429 }
            );
        }

        try {
            await connectDB();
            const user = await User.findOne({
                $or: [{ email }, { emailLower: email }],
            }).select("+password +twoFactor");

            if (!user || !user.password) {
                // Constant-time dummy compare to prevent timing oracle
                await bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234");
                return genericError();
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return genericError();

            if (!user.twoFactor?.enabled) {
                return NextResponse.json({ requires2fa: false });
            }

            const challengeToken = issueChallenge(user._id.toString());
            return NextResponse.json({ requires2fa: true, challengeToken });
        } catch (e) {
            console.error("[2fa-challenge/issue]", e);
            return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
        }
    }

    // ── Phase 2: verify ────────────────────────────────────────────────────
    if (parsed.data.action === "verify") {
        const { challengeToken, code } = parsed.data;

        let userId: string;
        try {
            userId = verifyChallenge(challengeToken);
        } catch {
            return NextResponse.json({ error: "Challenge expired or invalid. Please sign in again." }, { status: 400 });
        }

        // Per-user rate limit on 2FA attempts (3 per 5 minutes)
        const otpRl = await rateLimit(`2fa_otp_${userId}`, 3, 300_000);
        if (!otpRl.success) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait 5 minutes." },
                { status: 429 }
            );
        }

        try {
            await connectDB();
            const user = await User.findById(userId).select("+twoFactor");
            if (!user) return genericError(401);

            const secret = storedTotpSecret(user);
            if (!secret) return genericError(401);

            const totpOk     = verifyTotp(secret, code);
            const recoveryOk = !totpOk ? await consumeRecoveryCode(user, code) : false;

            if (!totpOk && !recoveryOk) {
                return NextResponse.json(
                    { error: "Invalid verification code." },
                    { status: 401 }
                );
            }

            return NextResponse.json({ ok: true });
        } catch (e) {
            console.error("[2fa-challenge/verify]", e);
            return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
