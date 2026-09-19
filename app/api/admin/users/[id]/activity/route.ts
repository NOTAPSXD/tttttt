import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, LoginHistory } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    const { id } = await params;
    if (!id) return new NextResponse("Missing user id", { status: 400 });

    try {
        await connectDB();
        const rows = await LoginHistory.find({ userId: id }).sort({ at: -1 }).limit(25).lean();

        const activities = rows.map((r: any) => ({
            id: String(r._id),
            userId: String(r.userId ?? ""),
            action: r.status === "success" ? "Login" : "Failed Login",
            timestamp: r.at instanceof Date ? r.at.toISOString() : r.at,
            ipAddress: r.ip || undefined,
            userAgent: r.userAgent || undefined,
            details: r.reason ? `reason: ${r.reason}` : undefined,
        }));

        return NextResponse.json({ activities });
    } catch (e) {
        console.error("activity route error:", e);
        return NextResponse.json({ activities: [] });
    }
}