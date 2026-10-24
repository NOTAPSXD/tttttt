import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User, Server } from "@/lib/db";
import { isAdmin, normalizeRole, requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { parseBody, adminCreateUserSchema } from "@/lib/validation";

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