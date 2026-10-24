"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
    Server as ServerIcon, Activity, Cpu, MemoryStick,
    ArrowUpRight, Bookmark, PlusCircle, RefreshCw
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/app/components/client/StatCard";
import { AccountCard } from "@/app/components/client/AccountCard";
import { CompactNotificationsPanel } from "@/app/components/client/NotificationsCard";
import { TrafficChart, TrafficSample } from "@/app/components/client/TrafficChart";
import { ServerCard, ServerCardSkeleton } from "@/app/components/client/ServerCard";
import { EmptyState, InlineErrorPanel } from "@/app/components/ui/primitives";
import { usePolling } from "@/app/hooks/usePolling";
import { ClientDashboardData, ClientServer } from "@/lib/clientserver";

interface DashboardContentProps {
    initial: ClientDashboardData;
}

type ServerFilter = "all" | "bookmarked";

export default function DashboardContent({ initial }: DashboardContentProps) {
    const [servers, setServers] = useState<ClientServer[]>(initial.servers);
    const [traffic, setTraffic] = useState(initial.traffic);
    const [filter, setFilter]   = useState<ServerFilter>("all");
    const [pollError, setPollError] = useState<string | null>(null);
    const samplesRef            = useRef<TrafficSample[]>([]);
    const [, forceTick]         = useState(0);
    const [isPending, startTransition] = useTransition();

    // 8-second live telemetry polling with defensive error handling
    const { data: polled, error: pollingErr, refresh } = usePolling<ClientDashboardData>(
        async () => {
            try {
                const res = await axios.get<ClientDashboardData>("/api/client/stats");
                setPollError(null);
                return res.data;
            } catch (err: any) {
                setPollError("Telemetry feed unavailable. Cached metrics shown.");
                throw err;
            }
        },
        8000,
        true,
    );

    useEffect(() => {
        if (!polled) return;
        startTransition(() => {
            setServers(polled.servers);
            setTraffic(polled.traffic);
            const sample: TrafficSample = {
                t:       Date.now(),
                rxGb:    polled.traffic?.rxGb || 0,
                txGb:    polled.traffic?.txGb || 0,
                totalGb: polled.traffic?.totalGb || 0,
            };
            samplesRef.current = [...samplesRef.current.slice(-40), sample];
            forceTick(n => n + 1);
        });
    }, [polled]);

    const toggleBookmark = async (serverId: string, next: boolean) => {
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, bookmarked: next } : s));
        try {
            await axios.patch(`/api/client/servers/${serverId}/bookmark`, { bookmarked: next });
            toast.success(next ? "Server bookmarked" : "Bookmark removed");
        } catch {
            setServers(prev => prev.map(s => s.id === serverId ? { ...s, bookmarked: !next } : s));
            toast.error("Could not update bookmark");
        }
    };

    const total           = servers.length;
    const online          = servers.filter(s => s.status === "RUNNING").length;
    const pctOnline       = total > 0 ? Math.round((online / total) * 100) : 0;
    const totalCpu        = servers.reduce((a, s) => a + s.cpuCores, 0);
    const totalRamGb      = servers.reduce((a, s) => a + s.memoryTotalMb, 0) / 1024;
    const bookmarkedCount = servers.filter(s => s.bookmarked).length;

    const visibleServers  = filter === "bookmarked"
        ? servers.filter(s => s.bookmarked)
        : servers;

    // Greeting logic
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good morning" :
        hour < 17 ? "Good afternoon" :
                    "Good evening";

    const formattedDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    // Primary action logic: "Deploy server" if user active, else "Contact support"
    const canDeploy = initial.user?.role !== "SUSPENDED";

    return (
        <div className="space-y-6 pb-12">
            {/* Inline Telemetry Error Notice (doesn't crash or hide existing dashboard) */}
            {pollError && (
                <InlineErrorPanel
                    message={pollError}
                    onRetry={() => {
                        setPollError(null);
                        refresh();
                    }}
                />
            )}

            {/* ── Page Header: Greeting + Date on left, ONE primary action on right ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8b93a1] mb-1">
                        {formattedDate}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#e6e8ec]">
                        {greeting}, {initial.user.name.split(" ")[0]}
                    </h1>
                    <p className="mt-1 text-[13px] text-[#8b93a1]">
                        {total === 0
                            ? "No servers provisioned yet."
                            : `${total} server${total !== 1 ? "s" : ""} active · ${online} running`}
                    </p>
                </div>

                {/* ONE primary CTA button on the right */}
                <div>
                    {canDeploy ? (
                        <Link
                            href="/client/servers"
                            className="inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2 text-[13px] font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[44px] shadow-sm"
                        >
                            <PlusCircle className="h-4 w-4" aria-hidden="true" />
                            <span>Deploy server</span>
                        </Link>
                    ) : (
                        <a
                            href="mailto:support@vexanode.com"
                            className="inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2 text-[13px] font-semibold text-white bg-[#1f242d] hover:bg-[#2c3448] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[44px]"
                        >
                            <span>Contact support</span>
                        </a>
                    )}
                </div>
            </div>

            {/* ── STATE 1: EMPTY STATE (0 SERVERS) ── */}
            {/* Rule: Do NOT render stat cards, traffic chart or zero values */}
            {total === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                    {/* Focused Empty State Card: Icon, Title, One-line explanation, Primary CTA */}
                    <div className="lg:col-span-2">
                        <EmptyState
                            icon={<ServerIcon className="h-6 w-6 text-[#8b93a1]" />}
                            title="No servers yet"
                            description="You don't have any servers provisioned. Deploy your first cloud instance to begin hosting your applications."
                            action={
                                <Link
                                    href="/client/servers"
                                    className="inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[44px]"
                                >
                                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                                    <span>Deploy server</span>
                                </Link>
                            }
                            className="h-full"
                        />
                    </div>

                    {/* Compact Account & Notifications panels beside it */}
                    <div className="space-y-6">
                        <AccountCard account={initial.user} />
                        <CompactNotificationsPanel />
                    </div>
                </div>
            ) : (
                /* ── STATE 2: HAS SERVERS ── */
                <>
                    {/* Row of 4 neutral stat cards with identical style, status dot only */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard
                            label="Active servers"
                            value={String(total)}
                            icon={<ServerIcon className="h-4 w-4" />}
                            sub={bookmarkedCount > 0 ? `${bookmarkedCount} bookmarked` : `${total} provisioned`}
                            tone="info"
                            showDot
                        />
                        <StatCard
                            label="Online"
                            value={`${online}/${total}`}
                            icon={<Activity className="h-4 w-4" />}
                            sub={total > 0 ? `${pctOnline}% operational` : "-"}
                            tone={pctOnline === 100 ? "success" : pctOnline > 0 ? "warning" : "danger"}
                            showDot
                        />
                        <StatCard
                            label="Compute"
                            value={totalCpu > 0 ? String(totalCpu) : "-"}
                            unit="vCPU"
                            icon={<Cpu className="h-4 w-4" />}
                            sub="Total allocated cores"
                        />
                        <StatCard
                            label="Memory"
                            value={totalRamGb > 0 ? totalRamGb.toFixed(1) : "-"}
                            unit="GB"
                            icon={<MemoryStick className="h-4 w-4" />}
                            sub="Total allocated RAM"
                        />
                    </div>

                    {/* Server List Section */}
                    <section aria-labelledby="servers-section-title" className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <h2 id="servers-section-title" className="text-[15px] font-semibold tracking-tight text-[#e6e8ec]">
                                    Servers
                                </h2>
                                <span className="rounded-full bg-[#11141a] px-2 py-0.5 text-[11px] font-mono font-medium text-[#8b93a1] border border-[#1f242d]">
                                    {total}
                                </span>
                            </div>

                            {/* Clean Filter Tabs (only when user has bookmarked servers) */}
                            {bookmarkedCount > 0 && (
                                <div
                                    className="flex items-center rounded-[6px] bg-[#11141a] p-0.5 border border-[#1f242d]"
                                    role="group"
                                    aria-label="Server filter"
                                >
                                    <button
                                        onClick={() => setFilter("all")}
                                        className={`rounded-[4px] px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none ${
                                            filter === "all"
                                                ? "bg-[#1f242d] text-[#e6e8ec]"
                                                : "text-[#8b93a1] hover:text-[#e6e8ec]"
                                        }`}
                                        aria-pressed={filter === "all"}
                                    >
                                        All ({total})
                                    </button>
                                    <button
                                        onClick={() => setFilter("bookmarked")}
                                        className={`flex items-center gap-1 rounded-[4px] px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none ${
                                            filter === "bookmarked"
                                                ? "bg-[#1f242d] text-[#e6e8ec]"
                                                : "text-[#8b93a1] hover:text-[#e6e8ec]"
                                        }`}
                                        aria-pressed={filter === "bookmarked"}
                                    >
                                        <Bookmark className="h-3 w-3" aria-hidden="true" />
                                        Bookmarked ({bookmarkedCount})
                                    </button>
                                </div>
                            )}

                            <Link
                                href="/client/servers"
                                className="text-[12px] font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors duration-150 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none rounded"
                            >
                                View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                        </div>

                        {/* Server Cards Grid */}
                        {visibleServers.length === 0 ? (
                            <div
                                className="rounded-[8px] bg-[#11141a] p-8 text-center"
                                style={{ border: "1px dashed #1f242d" }}
                            >
                                <Bookmark className="mx-auto mb-2 h-6 w-6 text-[#8b93a1]" aria-hidden="true" />
                                <p className="text-[13px] font-semibold text-[#e6e8ec]">No bookmarked servers</p>
                                <p className="mt-1 text-[12px] text-[#8b93a1]">
                                    Click the bookmark icon on any server card to pin it here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {visibleServers.map(server => (
                                    <ServerCard
                                        key={server.id}
                                        server={server}
                                        variant="compact"
                                        onBookmark={toggleBookmark}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Bottom Area: Traffic Chart + Account Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                        {/* Traffic chart renders ONLY when meaningful network data exists */}
                        <div className="lg:col-span-2">
                            <TrafficChart traffic={traffic} samples={samplesRef.current} />
                        </div>
                        <div className={traffic && (traffic.totalGb > 0 || samplesRef.current.length > 0) ? "lg:col-span-1" : "lg:col-span-3"}>
                            <AccountCard account={initial.user} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
