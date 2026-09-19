import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchClientDashboardData } from "@/lib/client-data";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await fetchClientDashboardData(session.user.id);

        if (!data) {
            return NextResponse.json({ error: "Dashboard data unavailable" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        console.error("API Error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}