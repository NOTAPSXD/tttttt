"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Server as ServerIcon, Activity, Cpu, Search, Radio } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import StatCard from "@/app/components/client/StatCard";
import { ServerCard, ServerCardSkeleton } from "@/app/components/client/ServerCard";
import { usePolling } from "@/app/hooks/usePolling";
import { ClientDashboardData, ClientServer } from "@/lib/clientserver";

interface ServerListContentProps {
    initial: ClientDashboardData;
}

export default function ServerListContent({ initial }: ServerListContentProps) {
    const [servers, setServers] = useState<ClientServer[]>(initial.servers);
    const [query, setQuery] = useState("");

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
                (s.ip || "").toLowerCase().includes(q) ||
                s.virtfusionId.toLowerCase().includes(q),
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
                    <h1 className="text-2xl font-bold text-panel-text md:text-3xl">Servers</h1>
                    <p className="mt-1 text-sm text-panel-muted">Status is resolved live from the provider.</p>
                </div>
                <div
                    className={`flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                        error
                            ? "border-danger-red/30 bg-danger-soft text-danger-red"
                            : "border-success-green/30 bg-success-soft text-success-green"
                    }`}
                >
                    <Radio className={`h-3 w-3 ${error ? "" : "animate-pulse"}`} />
                    {error ? "Telemetry offline" : `Live · last sync ${lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : "…"}s ago`}
                </div>
            </div>

            {/* Real header stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <StatCard
                    label="Total Nodes"
                    value={String(total)}
                    icon={<ServerIcon className="h-4 w-4" />}
                    sub={total === 0 ? "No VPS assigned" : `${total} assigned to you`}
                    tone="info"
                />
                <StatCard
                    label="Online"
                    value={String(online)}
                    icon={<Activity className="h-4 w-4" />}
                    sub={`${pctOnline}% of nodes are running`}
                    tone={online > 0 ? "success" : "muted"}
                />
                <StatCard
                    label="Online Rate"
                    value={total > 0 ? `${pctOnline}%` : "—"}
                    icon={<Activity className="h-4 w-4" />}
                    sub={error ? "Provider unreachable" : "Measured live"}
                    tone={error ? "danger" : "info"}
                />
                <StatCard
                    label="Total Compute"
                    value={String(totalCpu)}
                    unit="vCPU"
                    icon={<Cpu className="h-4 w-4" />}
                    sub="Across all assigned nodes"
                    tone="success"
                />
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-panel-faint" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, IP or node ID…"
                        className="h-9 w-full rounded-lg border border-stroke bg-surface pl-9 pr-3 text-sm text-panel-text outline-none placeholder:text-panel-faint focus:border-primary-blue/50 focus:ring-2 focus:ring-primary-blue/20"
                    />
                </div>
                <div className="ml-auto hidden items-center gap-2 text-xs text-panel-muted sm:flex">
                    <span>{filtered.length} shown</span>
                </div>
            </div>

            {/* Server cards */}
            {filtered.length === 0 ? (
                <Card className="p-10 text-center">
                    <ServerIcon className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
                    <h3 className="text-sm font-semibold text-panel-text">
                        {liveServers.length === 0 ? "No servers assigned" : "No matches"}
                    </h3>
                    <p className="mt-1 text-sm text-panel-muted">
                        {liveServers.length === 0
                            ? "Contact your administrator to provision a VPS."
                            : "Try a different search term."}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((server) => (
                        <ServerCard key={server.id} server={server} variant="list" />
                    ))}
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