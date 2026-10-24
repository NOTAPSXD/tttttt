import { NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { parseBody, registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    const parsed = await parseBody(req, registerSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    try {
        await connectDB();

        // H-3: Rate limit registration endpoints per IP (5 registrations per 5 minutes)
        const rl = await rateLimit(`register_${ip}`, 5, 300000);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many registration attempts. Please wait a few minutes before trying again." },
                { status: 429 }
            );
        }

        const { name, email, password } = parsed.data;

        const existingUser = await User.findOne({
            $or: [{ email }, { emailLower: email.toLowerCase() }],
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            emailLower: email.toLowerCase(),
            password: hashedPassword,
            role: "CLIENT",
            verified: true,
        });

        // F-015: Return strictly whitelisted safe public fields, never leaking internal Mongoose model properties
        return NextResponse.json({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            }
        }, { status: 201 });
    } catch (error: any) {
        // F-016: Handle MongoDB duplicate key collision (E11000) gracefully instead of generic 500
        if (error?.code === 11000) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
