import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

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
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) return null;

                // Brute force protection (rate limiting per email)
                // Limit: 5 failed attempts per 5 minutes (300,000 ms)
                const emailStr = String(credentials.email).toLowerCase();
                const rl = rateLimit(`login_${emailStr}`, 5, 300000);
                
                if (!rl.success) {
                    throw new Error("Too many login attempts. Please try again in 5 minutes.");
                }

                await connectDB();
                
                // NoSQL Injection protection: Force string types
                const email = String(credentials.email);
                const password = String(credentials.password);

                const user = await User.findOne({ email });

                if (!user || !user.password) return null; // Discord-only user

                const isValid = await bcrypt.compare(password, user.password);

                if (!isValid) return null;

                // Reset rate limit on success by making a dummy successful call
                // Not perfectly resetting here, but avoiding throwing errors for successful auth.

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
                        { email: user.email }
                    ]
                });

                if (!dbUser) {
                    // Auto-register new Discord user
                    dbUser = await User.create({
                        name: user.name || profile?.username || "Discord User",
                        email: user.email,
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
            }
            return true;
        },
        async jwt({ token, user, account }: any) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        }
    }
};
