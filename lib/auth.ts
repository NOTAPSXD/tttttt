import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { connectDB, LoginHistory, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { verifyTotp, consumeRecoveryCode, storedTotpSecret } from "@/lib/otp";
import { registerSession, newSessionId, hashSession, sessionActive } from "@/lib/sessions";

function getHeader(req: any, name: string): string | undefined {
    if (!req) return undefined;
    const headers = req.headers;
    if (!headers) return undefined;
    if (typeof headers.get === "function") {
        return headers.get(name) ?? undefined;
    }
    const val = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === "string" ? val : undefined;
}

function clientIp(req: any): string | undefined {
    const forwarded = getHeader(req, "x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || undefined;
    }
    const realIp = getHeader(req, "x-real-ip");
    if (realIp) return realIp.trim() || undefined;
    return req?.socket?.remoteAddress || undefined;
}

function clientUa(req: any): string | undefined {
    return getHeader(req, "user-agent");
}

async function recordLogin(opts: {
    user: any;
    ip?: string;
    ua?: string;
    status: "success" | "failed";
    reason?: string;
}) {
    try {
        await connectDB();
        await LoginHistory.create({
            userId: opts.user._id,
            ip: opts.ip || opts.user.lastLoginIp || "",
            userAgent: opts.ua,
            status: opts.status,
            reason: opts.reason,
            at: new Date(),
        });
    } catch (e) {
        console.error("[auth] failed to record login history:", e);
    }
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
            authorization: { params: { scope: 'identify email' } },
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                otp: { label: "Two-Factor Code", type: "text" },
            },
            async authorize(credentials, req) {
                try {
                    // NextAuth v4 + Next.js App Router (Turbopack) can fail to populate
                    // `credentials` from the request body. Parse it manually as fallback.
                    let creds = credentials as Record<string, string> | undefined;
                    if ((!creds?.email || !creds?.password) && req) {
                        try {
                            const raw = req as any;
                            if (typeof raw?.json === "function") {
                                const body = await raw.json();
                                creds = body as Record<string, string>;
                            } else if (raw?.body) {
                                const body = typeof raw.body === "string"
                                    ? JSON.parse(raw.body)
                                    : raw.body;
                                creds = body as Record<string, string>;
                            }
                        } catch {
                            // ignore, fall through to null check
                        }
                    }

                    if (!creds?.email || !creds?.password) {
                        console.error("[authorize] missing credentials — email:", creds?.email, "hasPassword:", !!creds?.password);
                        return null;
                    }

                    const emailLower = String(creds.email).toLowerCase().trim();
                    const ip = clientIp(req);
                    const ua = clientUa(req);

                    // Dual brute force protection: per-email (5/5m) AND per-IP (30/15m) (F-003)
                    const [rlEmail, rlIp] = await Promise.all([
                        rateLimit(`login_email_${emailLower}`, 5, 300000),
                        rateLimit(`login_ip_${ip}`, 30, 900000),
                    ]);
                    if (!rlEmail.success || !rlIp.success) {
                        throw new Error("Too many login attempts. Please try again in 5 minutes.");
                    }

                // NoSQL Injection protection: Force string types
                await connectDB();
                const email = String(creds.email);
                const password = String(creds.password);

                const user = await User.findOne({
                    $or: [{ email }, { emailLower }],
                });

                if (!user || !user.password) return null; // Discord-only user

                const isValid = await bcrypt.compare(password, user.password);

                if (!isValid) {
                    recordLogin({ user, ip, ua, status: "failed", reason: "BAD_PASSWORD" }).catch(() => {});
                    return null;
                }

                // 2FA: code optional on-screen, mandatory when enabled.
                if (user.twoFactor?.enabled) {
                    const code = String(creds.otp || "").trim();
                    const secret = storedTotpSecret(user);
                    if (!code || !secret) {
                        recordLogin({ user, ip, ua, status: "failed", reason: "MISSING_2FA" }).catch(() => {});
                        return null;
                    }
                    const totpOk = verifyTotp(secret, code);
                    const recoveryOk = !totpOk ? await consumeRecoveryCode(user, code) : false;
                    if (!totpOk && !recoveryOk) {
                        recordLogin({ user, ip, ua, status: "failed", reason: "BAD_2FA" }).catch(() => {});
                        return null;
                    }
                }

                // Record last login (non-blocking)
                User.updateOne(
                    { _id: user._id },
                    { $set: { lastLogin: new Date(), lastLoginIp: ip || undefined } }
                ).catch(() => {});
                resetRateLimit(`login_${emailLower}`).catch(() => {});
                recordLogin({ user, ip, ua, status: "success" }).catch(() => {});

                const sessionId = newSessionId();
                await registerSession({ userId: user._id.toString(), sessionId, ip, ua });

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    sessionId,
                    twoFactorVerified: user.twoFactor?.enabled === true,
                };
                } catch (err: any) {
                    console.error("[authorize] unexpected error:", err?.message ?? err);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }: any) {
            if (account?.provider === "discord") {
                // F-006: Require provider-side email verification before allowing OAuth sign-in
                if (!profile?.verified || !user?.email) {
                    console.warn(`[auth:discord] Denied unverified email or missing email for Discord ID: ${profile?.id}`);
                    return false;
                }

                await connectDB();
                const emailLower = String(user.email).toLowerCase();

                // Find user by Discord ID or verified Email
                let dbUser = await User.findOne({
                    $or: [
                        { discordId: profile?.id },
                        { email: user.email },
                        { emailLower },
                    ]
                });

                if (!dbUser) {
                    // Auto-register new Discord user
                    dbUser = await User.create({
                        name: user.name || profile?.username || "Discord User",
                        email: user.email,
                        emailLower,
                        discordId: profile?.id,
                        role: "CLIENT",
                        verified: true
                    });
                } else if (!dbUser.discordId && profile?.id) {
                    // F-006: Forbid auto-linking by email collision to ADMIN/SUPER_ADMIN or accounts with 2FA enabled
                    const isElevated = dbUser.role === "ADMIN" || dbUser.role === "SUPER_ADMIN";
                    const has2FA = dbUser.twoFactor?.enabled === true;
                    if (isElevated || has2FA) {
                        console.warn(`[auth:discord] Blocked collision linking for elevated/2FA user: ${dbUser.email}`);
                        return false;
                    }

                    // Safe to link Discord ID to existing regular client account
                    dbUser.discordId = profile.id;
                    await dbUser.save();
                }

                user.id = dbUser._id.toString();
                (user as any).role = dbUser.role;
                (user as any).sessionId = newSessionId();
                await registerSession({
                    userId: String(dbUser._id),
                    sessionId: (user as any).sessionId,
                });

                // Record last login (non-blocking)
                User.updateOne({ _id: dbUser._id }, { $set: { lastLogin: new Date() } }).catch(() => {});
            }
            return true;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.twoFactorVerified = user.twoFactorVerified === true;

                // Track this login as a server-side session (device management).
                if (user.sessionId) {
                    token.sessionHash = hashSession(String(user.sessionId));
                }

                // Initialize the password hash in the token
                await connectDB();
                const dbUser = await User.findById(user.id).select("password");
                token.passwordHash = dbUser?.password || "";
            } else if (token.id) {
                // Verify that the password in the database matches the token
                await connectDB();
                const dbUser = await User.findById(token.id).select("password twoFactor");
                const currentHash = dbUser?.password || "";
                if (token.passwordHash !== currentHash) {
                    // Password changed! Invalidate session
                    return {};
                }

                // F-007: If 2FA is active but token was issued before 2FA enrollment, drop session
                if (dbUser?.twoFactor?.enabled === true && !token.twoFactorVerified) {
                    return {};
                }

                // Verify the server-side session row still exists and is not revoked.
                if (token.sessionHash && !(await sessionActive(token.sessionHash))) {
                    // Session was revoked or expired — drop this session.
                    return {};
                }
            }
            return token;
        },
        async session({ session, token }: any) {
            if (!token || !token.id) {
                return null;
            }
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).sessionHash = token.sessionHash;
            }
            return session;
        }
    }
};