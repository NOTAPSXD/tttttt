"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Server, Activity, TrendingUp } from "lucide-react";

interface AnalyticsData {
    userGrowth: Array<{ month: string; users: number }>;
    serverUsage: Array<{ name: string; value: number }>;
    activityTrend: Array<{ date: string; actions: number }>;
    summary?: {
        totalUsers: number;
        adminCount: number;
        clientCount: number;
        totalServers: number;
        runningServers: number;
        uptime: string;
    };
}

export default function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
    const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    label="Total Users"
                    value={data.summary?.totalUsers.toString() || "0"}
                    change={data.summary ? `${data.summary.adminCount} Admin, ${data.summary.clientCount} Client` : "N/A"}
                    positive={true}
                />
                <MetricCard
                    icon={<Server className="w-5 h-5 text-purple-400" />}
                    label="Total Servers"
                    value={data.summary?.totalServers.toString() || "0"}
                    change={`${data.summary?.runningServers || 0} Running`}
                    positive={true}
                />
                <MetricCard
                    icon={<Activity className="w-5 h-5 text-emerald-400" />}
                    label="Uptime"
                    value={data.summary?.uptime || "0%"}
                    change="System Health"
                    positive={true}
                />
                <MetricCard
                    icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
                    label="Growth"
                    value={data.userGrowth.length > 1 ? `+${data.userGrowth[data.userGrowth.length - 1].users - data.userGrowth[data.userGrowth.length - 2].users}` : "0"}
                    change="This Month"
                    positive={true}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* User Growth Chart */}
                <div className="bg-[#09090b] border border-zinc-800 p-4 md:p-6 rounded-xl">
                    <h3 className="text-base md:text-lg font-bold text-white mb-4">User Growth</h3>
                    <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.userGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                                <YAxis stroke="#71717a" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#09090b",
                                        border: "1px solid #27272a",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: "#3b82f6", r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Server Distribution */}
                <div className="bg-[#09090b] border border-zinc-800 p-4 md:p-6 rounded-xl">
                    <h3 className="text-base md:text-lg font-bold text-white mb-4">Server Distribution</h3>
                    <div className="h-48 md:h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.serverUsage}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={window.innerWidth < 768 ? 60 : 80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.serverUsage.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Trend */}
                <div className="bg-[#09090b] border border-zinc-800 p-4 md:p-6 rounded-xl lg:col-span-2">
                    <h3 className="text-base md:text-lg font-bold text-white mb-4">Activity Trend (Last 7 Days)</h3>
                    <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.activityTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                                <YAxis stroke="#71717a" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#09090b",
                                        border: "1px solid #27272a",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="actions" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, change, positive }: any) {
    // Check if change is a percentage/number or descriptive text
    const isNumeric = change.includes('%') || change.includes('+') || change.includes('-');

    return (
        <div className="bg-[#09090b] border border-zinc-800 p-4 md:p-5 rounded-xl hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    {icon}
                </div>
                <span className={`text-xs font-semibold ${isNumeric
                        ? (positive ? "text-emerald-400" : "text-red-400")
                        : "text-zinc-500"
                    }`}>
                    {change}
                </span>
            </div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
        </div>
    );
}
