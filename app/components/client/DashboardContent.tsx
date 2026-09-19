"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Server as ServerIcon, Activity, Cpu, MemoryStick, ArrowUpRight, LayoutGrid, Bookmark } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import StatCard from "@/app/components/client/StatCard";
import AccountCard from "@/app/components/client/AccountCard";
import NotificationsCard from "@/app/components/client/NotificationsCard";
import TrafficChart, { TrafficSample } from "@/app/components/client/TrafficChart";
import { ServerCard, ServerCardSkeleton } from "@/app/components/client/ServerCard";
import { TaskTable } from "@/app/components/client/TaskTable";
import { usePolling } from "@/app/hooks/usePolling";
import { cn } from "@/app/components/ui/button";
import { ClientDashboardData, ClientServer } from "@/lib/clientserver";

interface DashboardContentProps {
    initial: ClientDashboardData;
}

type ServerTab = "recent" | "bookmarked";

export default function DashboardContent({ initial }: DashboardContentProps) {
    const [servers, setServers] = useState<ClientServer[]>(initial.servers);
    const [traffic, setTraffic] = useState(initial.traffic);
    const [tab, setTab] = useState<ServerTab>("recent");
    const samplesRef = useRef<TrafficSample[]>([]);
    const [, forceTick] = useState(0);

    const { data: polled } = usePolling<ClientDashboardData>(
        async () => {
            const res = await axios.get<ClientDashboardData>("/api/client/stats");
            return res.data;
        },
        8000,
        true,
    );

    useEffect(() => {
        if (!polled) return;
        setServers(polled.servers);
        setTraffic(polled.traffic);
        const sample: TrafficSample = {
            t: Date.now(),
            rxGb: polled.traffic.rxGb,
            txGb: polled.traffic.txGb,
            totalGb: polled.traffic.totalGb,
        };
        samplesRef.current = [...samplesRef.current.slice(-40), sample];
        forceTick((n) => n + 1);
    }, [polled]);

    const toggleBookmark = async (serverId: string, next: boolean) => {
        setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, bookmarked: next } : s)));
        try {
            await axios.patch(`/api/client/servers/${serverId}/bookmark`, { bookmarked: next });
        } catch {
            setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, bookmarked: !next } : s)));
            toast.error("Could not update bookmark");
        }
    };

    const visibleServers = tab === "bookmarked" ? servers.filter((s) => s.bookmarked) : servers;
    const total = servers.length;
    const online = servers.filter((s) => s.status === "RUNNING").length;
    const pctOnline = total > 0 ? Math.round((online / total) * 100) : 0;
    const totalCpu = servers.reduce((acc, s) => acc + s.cpuCores, 0);
    const totalRamGb = servers.reduce((acc, s) => acc + s.memoryTotalMb, 0) / 1024;

    const completedTasks = initial.tasks
        .concat(polled?.tasks ?? [])
        .filter((t) => /complet|success|finished|done/.test(t.status.toLowerCase()))
        .slice(0, 8);

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-panel-muted">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-panel-text md:text-3xl">
                        Welcome back, {initial.user.name.split(" ")[0]}
                    </h1>
                    <p className="mt-1 text-sm text-panel-muted">Manage your virtual servers from one place.</p>
                </div>
                <Link href="/client/servers">
                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                        View all servers <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <StatCard
                    label="Active Nodes"
                    value={String(total)}
                    icon={<ServerIcon className="h-4 w-4" />}
                    sub={total > 0 ? `${servers.filter((s) => s.bookmarked).length} bookmarked` : "0 assigned VPS"}
                    tone="info"
                />
                <StatCard
                    label="Online"
                    value={String(online)}
                    icon={<Activity className="h-4 w-4" />}
                    sub={`${pctOnline}% online`}
                    tone={pctOnline === 100 && total > 0 ? "success" : "muted"}
                />
                <StatCard
                    label="Compute"
                    value={String(totalCpu)}
                    unit="vCPU"
                    icon={<Cpu className="h-4 w-4" />}
                    sub="Total allocation"
                    tone="success"
                />
                <StatCard
                    label="Memory"
                    value={totalRamGb.toFixed(1)}
                    unit="GB"
                    icon={<MemoryStick className="h-4 w-4" />}
                    sub="Total allocation"
                    tone="warning"
                />
            </div>

            {/* Grid: account / notifications / traffic */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4">
                    <AccountCard account={initial.user} />
                    <NotificationsCard />
                </div>
                <div className="lg:col-span-2">
                    <TrafficChart traffic={traffic} samples={samplesRef.current} />
                </div>
            </div>

            {/* Servers */}
            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-stroke bg-surface p-0.5">
                        {(
                            [
                                { key: "recent", label: "Recent", icon: LayoutGrid },
                                { key: "bookmarked", label: "Bookmarked", icon: Bookmark },
                            ] as const
                        ).map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                                    tab === key ? "bg-surface-3 text-panel-text" : "text-panel-faint hover:text-panel-muted",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" /> {label}
                            </button>
                        ))}
                    </div>
                    <Link href="/client/servers" className="text-xs font-semibold text-primary-blue hover:text-info-blue">
                        View all →
                    </Link>
                </div>

                {servers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stroke-strong bg-surface p-10 text-center">
                        <ServerIcon className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
                        <h3 className="text-sm font-semibold text-panel-text">No infrastructure assigned</h3>
                        <p className="mt-1 text-sm text-panel-muted">
                            Contact an administrator to provision your first VPS.
                        </p>
                    </div>
                ) : visibleServers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stroke-strong bg-surface p-10 text-center">
                        <Bookmark className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
                        <h3 className="text-sm font-semibold text-panel-text">No bookmarked servers</h3>
                        <p className="mt-1 text-sm text-panel-muted">Tap the bookmark icon on a server card to pin it here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleServers.map((server) => (
                            <ServerCard key={server.id} server={server} variant="compact" onBookmark={toggleBookmark} />
                        ))}
                    </div>
                )}
            </section>

            {/* Recently completed tasks */}
            <section>
                <TaskTable
                    tasks={completedTasks}
                    showServer
                    limit={5}
                    title="Recently Completed Tasks"
                    description="Latest finished operations across your servers"
                    emptyText="No completed tasks yet."
                    collapsible={false}
                />
            </section>
        </div>
    );
}