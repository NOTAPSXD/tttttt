import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { connectDB, LoginHistory, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { verifyTotp, consumeRecoveryCode, storedTotpSecret } from "@/lib/otp";

function clientIp(req: Request | undefined): string | undefined {
    if (!req) return undefined;
    return req.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

function clientUa(req: Request | undefined): string | undefined {
    if (!req) return undefined;
    return req.headers?.get("user-agent") || undefined;
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
                if (!credentials?.email || !credentials?.password) return null;

                const emailLower = String(credentials.email).toLowerCase().trim();
                const ip = clientIp(req as Request);
                const ua = clientUa(req as Request);

                // Brute force protection (rate limiting per email)
                // Limit: 5 failed attempts per 5 minutes (300,000 ms)
                const rl = await rateLimit(`login_${emailLower}`, 5, 300000);
                if (!rl.success) {
                    throw new Error("Too many login attempts. Please try again in 5 minutes.");
                }

                // NoSQL Injection protection: Force string types
                await connectDB();
                const email = String(credentials.email);
                const password = String(credentials.password);

                const user = await User.findOne({
                    $or: [{ email }, { emailLower }],
                });

                if (!user || !user.password) return null; // Discord-only user

                const isValid = await bcrypt.compare(password, user.password);

                if (!isValid) {
                    await recordLogin({ user, ip, ua, status: "failed", reason: "BAD_PASSWORD" });
                    return null;
                }

                // 2FA: code optional on-screen, mandatory when enabled.
                if (user.twoFactor?.enabled) {
                    const code = String(credentials.otp || "").trim();
                    const secret = storedTotpSecret(user);
                    if (!code || !secret) {
                        await recordLogin({ user, ip, ua, status: "failed", reason: "MISSING_2FA" });
                        return null;
                    }
                    const totpOk = verifyTotp(secret, code);
                    const recoveryOk = !totpOk ? await consumeRecoveryCode(user, code) : false;
                    if (!totpOk && !recoveryOk) {
                        await recordLogin({ user, ip, ua, status: "failed", reason: "BAD_2FA" });
                        return null;
                    }
                }

                // Record last login (non-blocking)
                User.updateOne(
                    { _id: user._id },
                    { $set: { lastLogin: new Date(), lastLoginIp: ip || undefined } }
                ).catch(() => {});
                resetRateLimit(`login_${emailLower}`).catch(() => {});
                await recordLogin({ user, ip, ua, status: "success" });

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }: any) {
            if (account?.provider === "discord") {
                await connectDB();
                // Find user by Discord ID or Email
                let dbUser = await User.findOne({
                    $or: [
                        { discordId: profile?.id },
                        { email: user.email },
                        { emailLower: String(user.email || "").toLowerCase() },
                    ]
                });

                if (!dbUser) {
                    // Auto-register new Discord user
                    dbUser = await User.create({
                        name: user.name || profile?.username || "Discord User",
                        email: user.email,
                        emailLower: String(user.email || "").toLowerCase(),
                        discordId: profile?.id,
                        role: "CLIENT",
                        verified: true
                    });
                } else if (!dbUser.discordId && profile?.id) {
                    // Link Discord ID to existing email account
                    dbUser.discordId = profile.id;
                    await dbUser.save();
                }

                user.id = dbUser._id.toString();
                (user as any).role = dbUser.role;

                // Record last login (non-blocking)
                User.updateOne({ _id: dbUser._id }, { $set: { lastLogin: new Date() } }).catch(() => {});
            }
            return true;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;

                // Initialize the password hash in the token
                await connectDB();
                const dbUser = await User.findById(user.id).select("password");
                token.passwordHash = dbUser?.password || "";
            } else if (token.id) {
                // Verify that the password in the database matches the token
                await connectDB();
                const dbUser = await User.findById(token.id).select("password");
                const currentHash = dbUser?.password || "";
                if (token.passwordHash !== currentHash) {
                    // Password changed! Invalidate session
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
            }
            return session;
        }
    }
};