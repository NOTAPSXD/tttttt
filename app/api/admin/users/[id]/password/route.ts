import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import bcrypt from "bcryptjs";
import { isAdmin } from "@/lib/permissions";
import { parseBody, setPasswordSchema } from "@/lib/validation";
import { revokeAllUserSessions } from "@/lib/sessions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN" && !isAdmin(String(session?.user?.role))) return new NextResponse("Unauthorized", { status: 403 });

    const parsed = await parseBody(req, setPasswordSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { password } = parsed.data;

    const hashed = await bcrypt.hash(password, 10);

    await connectDB();
    await User.findByIdAndUpdate(id, { password: hashed });
    revokeAllUserSessions(id).catch(() => {});
    return NextResponse.json({ success: true });
}
