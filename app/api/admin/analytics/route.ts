import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { vf } from "@/lib/virtfusion";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Fetch all users with creation dates
        const allUsers = await User.find({}, 'createdAt role').sort({ createdAt: 1 }).lean();

        // Calculate user growth for last 6 months
        const now = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const userGrowth = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const usersUpToMonth = allUsers.filter((u: any) =>
                new Date(u.createdAt) <= monthEnd
            ).length;

            userGrowth.push({
                month: monthNames[date.getMonth()],
                users: usersUpToMonth
            });
        }

        // Fetch server data from VirtFusion
        let vfServers: any[] = [];
        let serverUsage = [
            { name: "Running", value: 0 },
            { name: "Stopped", value: 0 },
            { name: "Maintenance", value: 0 },
            { name: "Error", value: 0 },
        ];

        try {
            const data = await vf.getServers();
            vfServers = data || [];

            // Calculate server distribution
            vfServers.forEach(server => {
                if (server.state?.running) {
                    serverUsage[0].value++; // Running
                } else if (server.state?.status === "stopped") {
                    serverUsage[1].value++; // Stopped
                } else if (server.state?.status === "maintenance") {
                    serverUsage[2].value++; // Maintenance
                } else {
                    serverUsage[3].value++; // Error/Unknown
                }
            });
        } catch (e) {
            console.error("VirtFusion error:", e);
        }

        // Filter out categories with 0 values for cleaner pie chart
        serverUsage = serverUsage.filter(s => s.value > 0);

        // Activity Trend (Last 7 days) - Based on user registrations
        const activityTrend = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dailyUsers = allUsers.filter((u: any) => {
                const userDate = new Date(u.createdAt);
                return userDate >= date && userDate < nextDate;
            }).length;

            activityTrend.push({
                date: dayNames[date.getDay()],
                actions: dailyUsers * 5 // Multiply by estimated actions per user
            });
        }

        // Calculate summary metrics
        const totalUsers = allUsers.length;
        const adminCount = allUsers.filter((u: any) => u.role === "ADMIN").length;
        const clientCount = allUsers.filter((u: any) => u.role === "CLIENT").length;
        const totalServers = vfServers.length;
        const runningServers = serverUsage.find(s => s.name === "Running")?.value || 0;
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
                uptime: `${uptime}%`
            }
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
