import { connectDB, User, Server } from "@/lib/db";
import { getAdapter } from "@/lib/providers";
import { getSyncCounts } from "@/lib/sync";
import { isAdmin, normalizeRole } from "@/lib/permissions";
import { Users, Server as ServerIcon, Activity, TrendingUp, Database, Zap, Shield, AlertTriangle, Mail, HardDrive, Cpu, Layers } from "lucide-react";
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
    } catch (e: any) {
        console.warn("[admin] VirtFusion upstream catalog unavailable:", e?.message || e?.code || e);
    }

    // 4. Sync-derived counts fallback.
    let counts = { total: 0, mappedActive: 0, unassigned: 0, orphaned: 0, manual: 0 };
    try {
        counts = await getSyncCounts();
    } catch (e) {
        console.error("Sync counts error", e);
    }

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

    // 6. Accurate live totals reflecting both upstream VirtFusion and mapped DB records.
    const totalServersCount = vfServers.length > 0 ? vfServers.length : counts.total;
    const assignedServersCount = combinedServers.filter((s: any) => s.assignedTo).length;
    const unassignedServersCount = Math.max(0, totalServersCount - assignedServersCount);
    const runningServersCount = combinedServers.filter(
        (s: any) => s.state?.running === true || s.status === "RUNNING"
    ).length;

    const totalCpu = vfServers.reduce(
        (acc, s) => acc + (parseInt(String(s.cpu || "").match(/\d+/)?.[0] || "0") || 0),
        0
    );
    const totalRam = vfServers.reduce(
        (acc, s) => acc + (parseInt(String(s.memory || "").match(/\d+/)?.[0] || "0") || 0),
        0
    );
    const totalStorage = vfServers.reduce((acc, s) => {
        const storStr = s.storage?.[0]?.capacity || s.disk || s.storage || "";
        const gb = parseInt(String(storStr).match(/\d+/)?.[0] || "0") || 0;
        return acc + gb;
    }, 0);

    const uptimeRate = totalServersCount > 0
        ? Math.round((runningServersCount / totalServersCount) * 100)
        : 100;

    const serializedUsers = users;
    const serializedCombinedServers = JSON.parse(JSON.stringify(combinedServers));

    const cardBaseClass = "bg-[#09090b] border border-zinc-800 p-5 rounded-xl transition-all duration-300 hover:border-zinc-700";

    return (
        <div className="space-y-8 animate-slide-up pb-16 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Admin Dashboard</h2>
                    <p className="text-zinc-400 mt-1.5 text-sm md:text-base">
                        Overview of platform cloud infrastructure, virtual server instances, and user management.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link
                        href="/admin/mail/send"
                        className="flex-1 md:flex-initial bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        <Mail className="w-4 h-4 text-zinc-400" /> Send Mail
                    </Link>
                    <Link
                        href="/admin/users"
                        className="flex-1 md:flex-initial bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Users className="w-4 h-4" /> Manage Users
                    </Link>
                </div>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Users Card */}
                <div className={`${cardBaseClass} group`}>
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
                    <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            {adminCount} Admins
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            {clientCount} Clients
                        </span>
                    </div>
                </div>

                {/* Total Servers Card */}
                <div className={`${cardBaseClass} group`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                            <ServerIcon className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Inventory
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-semibold">Total Servers</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-white">{totalServersCount}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
                        <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {assignedServersCount} Assigned
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            {unassignedServersCount} Available
                        </span>
                    </div>
                </div>

                {/* Live Activity Card */}
                <div className={`${cardBaseClass} group`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                            <Activity className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-400">
                            Live
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-semibold">Running Instances</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-white">{runningServersCount}</h3>
                        <span className="text-xs text-zinc-500">/ {totalServersCount}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs border-t border-zinc-800/60 pt-3">
                        <div className={`w-2 h-2 rounded-full ${runningServersCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                        <span className={runningServersCount > 0 ? "text-emerald-400 font-medium" : "text-zinc-500"}>
                            {uptimeRate}% Active Rate
                        </span>
                    </div>
                </div>

                {/* Health Status Card */}
                <div className={`${cardBaseClass} group`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                            <Shield className="text-zinc-100 w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Health
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-semibold">System Status</p>
                    <div className="flex items-center gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-emerald-400">Operational</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/60 pt-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>VirtFusion API Connected</span>
                    </div>
                </div>
            </div>

            {/* Resource Capacity & Quick Actions - Balanced 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Column 1: Compute & Resource Capacity */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                Resource Allocation
                            </h3>
                            <p className="text-xs text-zinc-500">Allocated hardware compute & memory across instances</p>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">{totalServersCount} instances</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* CPU Cores */}
                        <div className={`${cardBaseClass} flex flex-col justify-between`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-amber-400">
                                        <Cpu className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-semibold">CPU Cores</p>
                                        <p className="text-[11px] text-zinc-500">Allocated vCPU</p>
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-white font-mono">{totalCpu}</p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                                    <span>vCPU Allocation</span>
                                    <span className="text-zinc-300">{totalCpu} vCPUs</span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div className="bg-amber-400 h-full rounded-full" style={{ width: totalCpu > 0 ? '75%' : '0%' }} />
                                </div>
                            </div>
                        </div>

                        {/* Memory Usage */}
                        <div className={`${cardBaseClass} flex flex-col justify-between`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-blue-400">
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Memory Usage</p>
                                        <p className="text-[11px] text-zinc-500">Allocated RAM</p>
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-white font-mono">
                                    {(totalRam / 1024).toFixed(1)} <span className="text-xs font-normal text-zinc-500">GB</span>
                                </p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                                    <span>RAM Capacity</span>
                                    <span className="text-zinc-300">{(totalRam / 1024).toFixed(1)} GB</span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: totalRam > 0 ? '60%' : '0%' }} />
                                </div>
                            </div>
                        </div>

                        {/* Storage Capacity */}
                        <div className={`${cardBaseClass} flex flex-col justify-between`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-emerald-400">
                                        <HardDrive className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Storage Volume</p>
                                        <p className="text-[11px] text-zinc-500">Primary NVMe / SSD</p>
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-white font-mono">
                                    {totalStorage > 0 ? `${totalStorage} GB` : "High-speed"}
                                </p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                                    <span>Storage Tier</span>
                                    <span className="text-zinc-300">NVMe High Performance</span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                                </div>
                            </div>
                        </div>

                        {/* Workload Distribution */}
                        <div className={`${cardBaseClass} flex flex-col justify-between`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-purple-400">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-semibold">Assignments</p>
                                        <p className="text-[11px] text-zinc-500">Workload split</p>
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-white font-mono">
                                    {assignedServersCount}<span className="text-zinc-600 font-normal">/{totalServersCount}</span>
                                </p>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                                    <span>Assigned to Clients</span>
                                    <span className="text-zinc-300">{totalServersCount > 0 ? Math.round((assignedServersCount / totalServersCount) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div className="bg-purple-500 h-full rounded-full" style={{ width: totalServersCount > 0 ? `${(assignedServersCount / totalServersCount) * 100}%` : '0%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Quick Management Shortcuts */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-400" />
                                Quick Actions
                            </h3>
                            <p className="text-xs text-zinc-500">Shortcuts to key platform controls and modules</p>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">Navigation</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Link
                            href="/admin/users"
                            className={`${cardBaseClass} group hover:bg-zinc-900/60 hover:border-zinc-700 flex flex-col justify-between`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-950/20 transition-all shrink-0">
                                    <Users className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                                    Accounts
                                </span>
                            </div>
                            <div className="mt-5">
                                <p className="text-white font-semibold text-sm group-hover:text-blue-300 transition-colors">User Database</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Manage accounts, client roles, and assignments</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/mail/send"
                            className={`${cardBaseClass} group hover:bg-zinc-900/60 hover:border-zinc-700 flex flex-col justify-between`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-950/20 transition-all shrink-0">
                                    <Mail className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                                    Broadcast
                                </span>
                            </div>
                            <div className="mt-5">
                                <p className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">Send Email</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Dispatch announcements & templated notices</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/mail/logs"
                            className={`${cardBaseClass} group hover:bg-zinc-900/60 hover:border-zinc-700 flex flex-col justify-between`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-purple-500/50 group-hover:bg-purple-950/20 transition-all shrink-0">
                                    <Shield className="w-5 h-5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors">
                                    Audits
                                </span>
                            </div>
                            <div className="mt-5">
                                <p className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors">Mail & Audit Logs</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Track email dispatches and administrative events</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/analytics"
                            className={`${cardBaseClass} group hover:bg-zinc-900/60 hover:border-zinc-700 flex flex-col justify-between`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-950/20 transition-all shrink-0">
                                    <TrendingUp className="w-5 h-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-500/30 transition-colors">
                                    Metrics
                                </span>
                            </div>
                            <div className="mt-5">
                                <p className="text-white font-semibold text-sm group-hover:text-amber-300 transition-colors">System Analytics</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Monitor traffic, compute utilization, and activity</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Master Server List Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                            <ServerIcon className="w-5 h-5 text-blue-400" />
                            Master Server Inventory
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                            Provisioned VirtFusion virtual private servers and client assignments
                        </p>
                    </div>
                    <div className="flex gap-2 text-xs font-mono">
                        <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {assignedServersCount} ASSIGNED
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            {unassignedServersCount} AVAILABLE
                        </div>
                    </div>
                </div>

                <ServerAssigner servers={serializedCombinedServers} users={serializedUsers} />
            </div>

            {/* Orphaned Assignments Section */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-2">Database Cleanup</h3>
                <OrphanedServers />
            </div>
        </div>
    );
}
