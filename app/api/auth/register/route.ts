import { NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        await connectDB();
        const json = await req.json();
        const { name, email, password } = json;

        if (!email || !password || !name) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "CLIENT",
        });

        const userObj = user.toObject();
        const { password: _, ...userWithoutPassword } = userObj;

        // Ensure id is available
        return NextResponse.json({
            user: {
                ...userWithoutPassword,
                id: user._id.toString()
            }
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
