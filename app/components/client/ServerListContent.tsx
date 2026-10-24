"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Server as ServerIcon, Activity, Cpu, Search, Radio, LayoutGrid, List } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import StatCard from "@/app/components/client/StatCard";
import { ServerCard, ServerCardSkeleton } from "@/app/components/client/ServerCard";
import { usePolling } from "@/app/hooks/usePolling";
import { ClientDashboardData, ClientServer } from "@/lib/clientserver";
import { EmptyState } from "@/app/components/ui/primitives";

interface ServerListContentProps {
    initial: ClientDashboardData;
}

export default function ServerListContent({ initial }: ServerListContentProps) {
    const [servers, setServers] = useState<ClientServer[]>(initial.servers);
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    const { data: polled, lastUpdated, error } = usePolling<ClientDashboardData>(
        async () => {
            const res = await axios.get<ClientDashboardData>("/api/client/stats");
            return res.data;
        },
        6000,
        true,
    );

    const liveServers = polled?.servers ?? servers;
    const activeServers = useMemo(() => liveServers, [liveServers]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return activeServers;
        return activeServers.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                (s.ip || "").toLowerCase().includes(q),
        );
    }, [activeServers, query]);

    const total = activeServers.length;
    const online = activeServers.filter((s) => s.status === "RUNNING").length;
    const pctOnline = total > 0 ? Math.round((online / total) * 100) : 0;
    const totalCpu = activeServers.reduce((acc, s) => acc + s.cpuCores, 0);

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#e6e8ec] tracking-tight md:text-3xl">Servers</h1>
                    <p className="mt-1 text-sm text-[#8b93a1]">Manage and monitor your cloud instances in real time.</p>
                </div>
                <div
                    className={`flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                        error
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    }`}
                >
                    <Radio className={`h-3 w-3 ${error ? "" : "animate-pulse"}`} aria-hidden="true" />
                    <span>{error ? "Telemetry offline" : `Live · updated ${lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : "0"}s ago`}</span>
                </div>
            </div>

            {/* Real header stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <StatCard
                    label="Total Nodes"
                    value={String(total)}
                    icon={<ServerIcon className="h-4 w-4" />}
                    sub={total === 0 ? "No active VPS" : `${total} instances`}
                    tone="info"
                />
                <StatCard
                    label="Online"
                    value={String(online)}
                    icon={<Activity className="h-4 w-4" />}
                    sub={`${pctOnline}% active`}
                    tone={online > 0 ? "success" : "muted"}
                />
                <StatCard
                    label="Uptime Rate"
                    value={total > 0 ? `${pctOnline}%` : "—"}
                    icon={<Activity className="h-4 w-4" />}
                    sub="Fleet health"
                    tone={error ? "danger" : "info"}
                />
                <StatCard
                    label="Total Compute"
                    value={String(totalCpu)}
                    unit="vCPU"
                    icon={<Cpu className="h-4 w-4" />}
                    sub="Assigned compute"
                    tone="success"
                />
            </div>

            {/* Toolbar: Search & View Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a1]" aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by server name or IP…"
                        className="h-9 w-full rounded-[8px] border border-[#1f242d] bg-[#11141a] pl-9 pr-3 text-[13px] text-[#e6e8ec] outline-none placeholder:text-[#8b93a1] focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/40 transition-colors"
                        aria-label="Search servers"
                    />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#8b93a1]">
                    <span>{filtered.length} {filtered.length === 1 ? "server" : "servers"}</span>
                    <div className="inline-flex items-center rounded-[6px] border border-[#1f242d] bg-[#0a0c10] p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-[4px] transition-colors ${viewMode === "grid" ? "bg-[#1f242d] text-[#e6e8ec]" : "text-[#8b93a1] hover:text-[#e6e8ec]"}`}
                            aria-label="Grid view"
                            aria-pressed={viewMode === "grid"}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-[4px] transition-colors ${viewMode === "table" ? "bg-[#1f242d] text-[#e6e8ec]" : "text-[#8b93a1] hover:text-[#e6e8ec]"}`}
                            aria-label="Table view"
                            aria-pressed={viewMode === "table"}
                        >
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Server Display */}
            {filtered.length === 0 ? (
                <EmptyState
                    icon={<ServerIcon className="h-6 w-6" />}
                    title={liveServers.length === 0 ? "No servers found" : "No matching servers"}
                    description={
                        liveServers.length === 0
                            ? "There are currently no active VPS instances assigned to your account."
                            : "Try adjusting your search query."
                    }
                />
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((server) => (
                        <ServerCard key={server.id} server={server} variant="list" />
                    ))}
                </div>
            ) : (
                <div className="rounded-[8px] bg-[#11141a] border border-[#1f242d] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-[#1f242d] bg-[#0a0c10]/60 text-[#8b93a1] text-[11px] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">Server</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">IP Address</th>
                                    <th className="py-3 px-4">Compute</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1f242d]">
                                {filtered.map((server) => {
                                    const displayStatus =
                                        server.status === "RUNNING" ? "Online" :
                                        server.status === "STOPPED" || server.status === "OFFLINE" ? "Offline" :
                                        server.status === "SUSPENDED" ? "Suspended" : "Provisioning";

                                    return (
                                        <tr key={server.id} className="hover:bg-[#141820] transition-colors">
                                            <td className="py-3 px-4 font-medium text-[#e6e8ec]">
                                                <a href={`/client/servers/${server.id}`} className="hover:text-[#3b82f6] transition-colors">
                                                    {server.name}
                                                </a>
                                                <div className="text-[11px] text-[#8b93a1] flex items-center gap-1.5 mt-0.5">
                                                    <span>{server.locationFlag}</span>
                                                    <span>{server.location}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                                    displayStatus === "Online"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                                        : displayStatus === "Offline"
                                                        ? "bg-red-500/10 text-red-400 border-red-500/25"
                                                        : displayStatus === "Suspended"
                                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                                        : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                        displayStatus === "Online" ? "bg-emerald-400 animate-pulse" :
                                                        displayStatus === "Offline" ? "bg-red-400" :
                                                        displayStatus === "Suspended" ? "bg-amber-400" : "bg-blue-400"
                                                    }`} />
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[12px] text-[#8b93a1]">
                                                {server.ip || "—"}
                                            </td>
                                            <td className="py-3 px-4 text-[12px] text-[#8b93a1]">
                                                {server.cpuCores} vCPU · {server.memoryTotalMb > 0 ? `${Math.round(server.memoryTotalMb / 1024)} GB` : "—"}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <a
                                                    href={`/client/servers/${server.id}`}
                                                    className="inline-flex items-center justify-center h-8 px-3 rounded-[6px] text-[12px] font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-colors focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none"
                                                >
                                                    Manage
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export const ServerListSkeletonGrid = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
            <ServerCardSkeleton key={i} variant="list" />
        ))}
    </div>
);
