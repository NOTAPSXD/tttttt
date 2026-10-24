import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User, Server } from "@/lib/db";
import { isAdmin, normalizeRole, requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { parseBody, adminCreateUserSchema } from "@/lib/validation";
import { sendEmail } from "@/lib/email";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    try {
        const [usersList, counts] = await Promise.all([
            User.find({}, { name: 1, email: 1, _id: 1, role: 1, status: 1, suspended: 1 }).sort({ name: 1 }).lean(),
            // Single aggregation instead of N per-user countDocuments calls.
            Server.aggregate<{ _id: any; count: number }>([{ $group: { _id: "$ownerId", count: { $sum: 1 } } }]),
        ]);

        const countMap = new Map<string, number>();
        for (const row of counts) {
            if (!row._id) continue;
            countMap.set(String(row._id), row.count);
        }

        return NextResponse.json(
            usersList.map((u: any) => ({
                id: String(u._id),
                _id: String(u._id),
                name: u.name,
                email: u.email,
                role: normalizeRole(u.role),
                status: u.status || (u.suspended ? "suspended" : "active"),
                _count: { servers: countMap.get(String(u._id)) || 0 },
            }))
        );
    } catch (e) {
        console.error("users GET failed:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

const VALID_ROLES = ["CLIENT", "SUPPORT", "ADMIN", "SUPER_ADMIN"];

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    const parsed = await parseBody(req, adminCreateUserSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, email, password, role } = parsed.data;

    // Normalize email casing to prevent duplicate-account confusion.
    const normalizedEmail = email.toLowerCase();

    const chosenRole = role ?? "CLIENT";
    if (!VALID_ROLES.includes(chosenRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    // Only SUPER_ADMIN can grant SUPER_ADMIN.
    if (chosenRole === "SUPER_ADMIN" && !requireSuperAdmin(String(session.user.role))) {
        return NextResponse.json({ error: "Insufficient permissions to assign this role" }, { status: 403 });
    }

    const hashed = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({
            name: name || normalizedEmail.split("@")[0],
            email: normalizedEmail,
            emailLower: normalizedEmail,
            password: hashed,
            role: chosenRole,
        });

        // Send welcome email to newly created account
        if (user.email) {
            const loginUrl = (process.env.NEXTAUTH_URL || "https://vps.vexanode.cloud").replace(/\/+$/, "") + "/login";
            sendEmail(
                user.email,
                "Welcome to VexaNode - Account Details",
                `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0c10; color: #e6e8ec; border: 1px solid #1f242d; border-radius: 8px;">
                    <div style="margin-bottom: 20px; border-bottom: 1px solid #1f242d; padding-bottom: 16px;">
                        <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">VEXANODE</span>
                    </div>
                    <h2 style="font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0;">Welcome to VexaNode</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        Hello <b style="color: #e6e8ec;">${user.name}</b>, your account has been set up.
                    </p>
                    <div style="margin: 24px 0; padding: 14px; background: #11141a; border: 1px solid #1f242d; border-radius: 6px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #8b93a1;">
                            <strong style="color: #e6e8ec;">Email:</strong> ${user.email}
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #8b93a1;">
                            <strong style="color: #e6e8ec;">Role:</strong> ${user.role}
                        </p>
                    </div>
                    <p style="font-size: 14px; line-height: 1.6; color: #8b93a1;">
                        You can sign in to your dashboard here:
                    </p>
                    <div style="margin-top: 16px;">
                        <a href="${loginUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">Sign in to Dashboard</a>
                    </div>
                </div>
                `,
                session.user.email || "SYSTEM"
            ).catch((err) => console.error("Failed to send welcome email:", err));
        }

        return NextResponse.json({
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (e) {
        return NextResponse.json({ error: "Email likely exists" }, { status: 400 });
    }
}