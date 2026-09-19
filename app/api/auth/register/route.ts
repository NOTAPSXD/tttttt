import { NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { parseBody, registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
    const parsed = await parseBody(req, registerSchema);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        await connectDB();
        const { name, email, password } = parsed.data;

        const existingUser = await User.findOne({
            $or: [{ email }, { emailLower: email }],
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            emailLower: email,
            password: hashedPassword,
            role: "CLIENT",
            verified: true,
        });

        const userObj = user.toObject();
        const userWithoutPassword = { ...userObj } as Record<string, unknown>;
        delete userWithoutPassword.password;

        return NextResponse.json({
            user: {
                ...userWithoutPassword,
                id: user._id.toString()
            }
        });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}