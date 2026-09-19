import { connectDB, User, Server } from "@/lib/db";
import { getAdapter } from "@/lib/providers";
import { getSyncCounts } from "@/lib/sync";
import { isAdmin, normalizeRole } from "@/lib/permissions";
import { Users, Server as ServerIcon, Activity, TrendingUp, Database, Zap, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";
import ServerAssigner from "@/app/components/ServerAssigner";
import OrphanedServers from "@/app/components/OrphanedServers";

export default async function AdminDashboard() {
    await connectDB();

    // 1. Users, counted via a single $group aggregation on the owner field.
    const usersData = await User.find().select("name email role status suspended").lean();
    const serverCounts = await Server.aggregate([{ $group: { _id: "$ownerId", count: { $sum: 1 } } }]);
    const countMap = new Map(serverCounts.map((s: any) => [s._id ? String(s._id) : null, s.count]));

    const users = usersData.map((u: any) => ({
        id: String(u._id),
        _id: String(u._id),
        name: u.name || "User",
        email: u.email || "",
        role: normalizeRole(u.role),
        status: u.suspended ? "suspended" : u.status || "active",
        _count: { servers: countMap.get(String(u._id)) || 0 },
    }));

    const adminCount = users.filter((u: any) => isAdmin(u.role)).length;
    const clientCount = users.length - adminCount;

    // 2. DB assignments, with the assigned owner populated for the assigner.
    let dbServers: any[] = [];
    try {
        const rawDbServers = await Server.find().populate("ownerId").lean();
        dbServers = rawDbServers.map((s: any) => ({
            ...s,
            id: String(s._id),
            _id: String(s._id),
            user: s.ownerId
                ? { ...s.ownerId, id: String(s.ownerId._id), _id: String(s.ownerId._id) }
                : null,
            userId: s.ownerId ? String(s.ownerId._id) : null,
        }));
    } catch (e) {
        console.error("DB Error", e);
    }

    // 3. Provider catalog (raw ids/names used to populate the master list).
    let vfServers: any[] = [];
    try {
        const adapter = getAdapter("virtfusion");
        vfServers = (await adapter.listUpstream()) || [];
    } catch (e) {
        console.error("VF Error", e);
    }

    // 4. Sync-derived counts — accurate totals without per-server round trips.
    let counts = { total: 0, mappedActive: 0, unassigned: 0, orphaned: 0, manual: 0 };
    try {
        counts = await getSyncCounts();
    } catch (e) {
        console.error("Sync counts error", e);
    }
    const unassignedCount = counts.unassigned;
    const runningCount = dbServers.filter(
        (s: any) => s.status === "RUNNING" && !s.providerDeletedAt
    ).length;

    // 5. Merge the provider catalog against mapped assignments.
    const dbServerMap = new Map(
        dbServers.filter((s: any) => !s.providerDeletedAt).map((s: any) => [s.providerServerId, s])
    );

    const combinedServers = vfServers.map((vf: any) => {
        const db = dbServerMap.get(vf.id);
        return {
            ...vf,
            assignedTo: db?.user || null,
            localId: db?.id || null,
            renewalDate: db?.renewalDate || null,
        };
    });

    const totalCpu = vfServers.reduce(
        (acc, s) => acc + (parseInt(String(s.cpu || "").match(/\d+/)?.[0] || "0") || 0),
        0
    );
    const totalRam = vfServers.reduce(
        (acc, s) => acc + (parseInt(String(s.memory || "").match(/\d+/)?.[0] || "0") || 0),
        0
    );

    const serializedUsers = users;
    const serializedCombinedServers = JSON.parse(JSON.stringify(combinedServers));

    // Helper for consistency
    const cardBaseClass = "bg-[#09090b] border border-zinc-800 p-5 rounded-xl transition-all duration-300 hover:border-zinc-700";

    return (
        <div className="space-y-8 animate-slide-up pb-20 md:pb-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Admin Dashboard</h2>
                    <p className="text-zinc-400 mt-2 text-sm md:text-base">Overview of platform resources and user management.</p>
                </div>

                <div className="w-full md:w-auto">
                    <Link
                        href="/admin/users"
                        className="w-full md:w-auto bg-white text-black hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/20 hover:scale-105 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <Users className="w-4 h-4" /> Manage Users
                    </Link>
                </div>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Users Card */}
                <div className={`${cardBaseClass} hover:shadow-lg hover:shadow-zinc-900/50 hover:scale-[1.02] group`} style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                            <Users className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Total
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-semibold">Platform Users</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-white">{users.length}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div> {adminCount} Admins</span>
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div> {clientCount} Clients</span>
                    </div>
                </div>

                {/* Servers Card */}
                <div className={`${cardBaseClass} hover:border-zinc-600`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                            <ServerIcon className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Inventory
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">Total Servers</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-white">{counts.total}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3">
                        <span className="text-zinc-300">{counts.mappedActive} Assigned</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-300">{unassignedCount} Unassigned</span>
                    </div>
                </div>

                {/* Activity Card */}
                <div className={`${cardBaseClass} hover:border-zinc-600`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                            <Activity className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-950 border border-emerald-900 text-emerald-500">
                            Live
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">Running Instances</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-white">{runningCount}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-emerald-500 font-medium">
                            {counts.total > 0 ? ((runningCount / counts.total) * 100).toFixed(0) : 0}% Uptime Rate
                        </span>
                    </div>
                </div>

                {/* Status Card */}
                <div className={`${cardBaseClass} hover:border-zinc-600`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                            <Shield className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Health
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">System Status</p>
                    <div className="flex items-center gap-2 mt-1">
                        <h3 className="text-xl font-bold text-white">Operational</h3>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3">
                        <AlertTriangle className="w-3 h-3 text-zinc-600" />
                        <span>0 Active Alerts</span>
                    </div>
                </div>
            </div>

            {/* Resource & Quick Actions Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">

                {/* Resource Usage Column (Takes up 2/3 on desktop) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Resource Allocation</h3>

                    <div className={`${cardBaseClass} flex flex-col justify-center`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">CPU Cores</p>
                                    <p className="text-xs text-zinc-500">Allocated Compute</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">{totalCpu}</p>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                            <div className="bg-white h-full" style={{ width: '75%' }} />
                        </div>
                    </div>

                    <div className={`${cardBaseClass} flex flex-col justify-center`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800">
                                    <Database className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Memory Usage</p>
                                    <p className="text-xs text-zinc-500">Allocated RAM</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">{(totalRam / 1024).toFixed(1)} <span className="text-sm font-normal text-zinc-500">GB</span></p>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                            <div className="bg-zinc-500 h-full" style={{ width: '60%' }} />
                        </div>
                    </div>
                </div>

                {/* Quick Actions Column (Takes up 1/3 on desktop) */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>

                    <Link href="/admin/users" className={`${cardBaseClass} flex items-center gap-4 group hover:bg-zinc-900/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-zinc-900/50 cursor-pointer`}>
                        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-all">
                            <Users className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm group-hover:text-white transition-colors">User Database</p>
                            <p className="text-xs text-zinc-500">Manage accounts & roles</p>
                        </div>
                    </Link>

                    <button className={`${cardBaseClass} w-full flex items-center gap-4 group hover:bg-zinc-900 cursor-pointer text-left`}>
                        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                            <Shield className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">Audit Logs</p>
                            <p className="text-xs text-zinc-500">System security records</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Master Server List */}
            <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#09090b]">
                <div className="p-5 border-b border-[#27272a] bg-[#09090b]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ServerIcon className="w-5 h-5 text-zinc-400" />
                                Master Server List
                            </h3>
                        </div>
                        <div className="flex gap-2 text-xs font-mono">
                            <div className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                {counts.mappedActive} ASSIGNED
                            </div>
                            <div className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                                {unassignedCount} AVAILABLE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    <ServerAssigner servers={serializedCombinedServers} users={serializedUsers} />
                </div>
            </div>

            {/* Orphaned Assignments - servers deleted on the provider but still in the DB */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-2">Database Cleanup</h3>
                <OrphanedServers />
            </div>
        </div>
    )
}