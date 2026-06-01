import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User, Server, VPSServer } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    try {
        const usersList = await User.find({}, { name: 1, email: 1, _id: 1, role: 1 }).sort({ name: 1 }).lean();
        
        const users = await Promise.all(usersList.map(async (u: any) => {
            const userIdStr = u._id.toString();
            const vfCount = await Server.countDocuments({ userId: userIdStr });
            const ec2Count = await VPSServer.countDocuments({ userId: userIdStr });
            
            return {
                id: userIdStr,
                _id: userIdStr,
                name: u.name,
                email: u.email,
                role: u.role,
                _count: {
                    servers: vfCount + ec2Count
                }
            };
        }));
        
        return NextResponse.json(users);
    } catch (e) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    await connectDB();
    const { name, email, password, role } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({
            name: name || email.split('@')[0],
            email,
            password: hashed,
            role: role || "CLIENT"
        });
        return NextResponse.json(user);
    } catch (e) {
        return NextResponse.json({ error: "Email likely exists" }, { status: 400 });
    }
}
