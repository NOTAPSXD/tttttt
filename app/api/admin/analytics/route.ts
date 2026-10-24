import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User, Server, AuditLog } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdmin(String(session.user.role))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const today = new Date();

        // ── Users ─────────────────────────────────────────────────────────
        const allUsers = await User.find({}, "createdAt role").sort({ createdAt: 1 }).lean();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const userGrowth = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            const cumulative = allUsers.filter((u: any) => new Date(u.createdAt) <= monthEnd).length;
            userGrowth.push({ month: monthNames[date.getMonth()], users: cumulative });
        }

        // ── Servers (owned by this panel, not fabricated) ─────────────────
        const [serverDocs, serverDistribution] = await Promise.all([
            Server.find({ providerDeletedAt: null }, "name status suspended ownerId createdAt providerType").lean(),
            Server.aggregate<{ _id: string; count: number }>([
                { $match: { providerDeletedAt: null } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        const serverUsage = [
            { name: "Running", value: 0 },
            { name: "Stopped", value: 0 },
            { name: "Provisioning", value: 0 },
            { name: "Error", value: 0 },
        ];
        for (const row of serverDistribution) {
            const status = String(row._id || "").toUpperCase();
            if (status === "RUNNING") serverUsage[0].value += row.count;
            else if (["STOPPED", "OFFLINE"].includes(status)) serverUsage[1].value += row.count;
            else if (status === "PROVISIONING") serverUsage[2].value += row.count;
            else serverUsage[3].value += row.count;
        }

        // ── Activity (last 7 days) from real audit logs ───────────────────
        const since = new Date(today);
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);

        const auditBuckets = await AuditLog.aggregate<{ _id: string; count: number }>([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]);
        const auditByDay = new Map(auditBuckets.map((r) => [r._id, r.count]));

        const activityTrend = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            activityTrend.push({
                date: dayNames[date.getDay()],
                actions: auditByDay.get(key) || 0,
            });
        }

        // ── Summary ───────────────────────────────────────────────────────
        const totalUsers = allUsers.length;
        const adminCount = allUsers.filter((u: any) => ["ADMIN", "SUPER_ADMIN"].includes(u.role)).length;
        const clientCount = allUsers.filter((u: any) => ["CLIENT", "SUPPORT", "USER"].includes(u.role) || !["ADMIN", "SUPER_ADMIN"].includes(u.role)).length;

        const totalServers = serverDocs.length;
        const runningServers = serverDocs.filter((s: any) => String(s.status).toUpperCase() === "RUNNING").length;
        const suspendedServers = serverDocs.filter((s: any) => s.suspended).length;
        const uptime = totalServers > 0 ? ((runningServers / totalServers) * 100).toFixed(1) : "0.0";

        return NextResponse.json({
            userGrowth,
            serverUsage,
            activityTrend,
            summary: {
                totalUsers,
                adminCount,
                clientCount,
                totalServers,
                runningServers,
                suspendedServers,
                uptime: `${uptime}%`,
            },
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}