"use client";

import Link from "next/link";
import { Bookmark, ArrowUpRight, Copy, Check, Cpu, MemoryStick } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, cn } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/badge";
import { ResourceBar } from "@/app/components/ui/progress";
import { Skeleton } from "@/app/components/ui/skeleton";
import OsIcon from "@/app/components/client/OsIcon";
import { ClientServer, formatGib } from "@/lib/clientserver";

interface ServerCardProps {
    server: ClientServer;
    variant?: "compact" | "list";
    onBookmark?: (id: string, bookmarked: boolean) => void;
}

export function ServerCardSkeleton({ variant = "compact" }: { variant?: "compact" | "list" }) {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            {variant === "list" && (
                <div className="mt-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-2 w-full" />
                </div>
            )}
        </Card>
    );
}

export function ServerCard({ server, variant = "compact", onBookmark }: ServerCardProps) {
    const [copied, setCopied] = useState(false);
    const ip = server.ip || "—";
    const href = `/client/servers/${server.id}`;

    const realMem = server.state?.memUsedMb ?? 0;
    const memPct = server.memoryTotalMb > 0 ? (realMem / server.memoryTotalMb) * 100 : 0;

    const copyIp = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!server.ip) return;
        try {
            await navigator.clipboard.writeText(server.ip);
            setCopied(true);
            toast.success("IP copied", { description: server.ip });
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Could not copy IP");
        }
    };

    return (
        <Link href={href} className="group block focus-visible:outline-none">
            <Card
                className={cn(
                    "p-4 transition-all duration-200 hover:border-stroke-strong hover:bg-surface-2/60",
                    "focus-visible:ring-2 focus-visible:ring-primary-blue/50 h-full",
                    variant === "list" && "flex flex-col gap-4",
                )}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <OsIcon os={server.os.icon} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-panel-text">{server.name}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-panel-muted">
                                <span>{server.locationFlag}</span>
                                <span className="truncate">{server.location}</span>
                                {server.cpuCores > 0 && (
                                    <>
                                        <span className="text-panel-faint">·</span>
                                        <span className="text-panel-faint">{server.cpuCores} vCPU</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {onBookmark && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onBookmark(server.id, !server.bookmarked);
                                }}
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-md border border-stroke transition-colors",
                                    server.bookmarked
                                        ? "text-primary-blue bg-primary-blue-soft border-primary-blue/40"
                                        : "text-panel-faint hover:text-panel-text hover:bg-surface-3",
                                )}
                                aria-label={server.bookmarked ? "Remove bookmark" : "Add bookmark"}
                            >
                                <Bookmark className={cn("h-3.5 w-3.5", server.bookmarked && "fill-current")} />
                            </button>
                        )}
                        <StatusBadge label={server.status} tone={server.tone} className="hidden sm:inline-flex" />
                    </div>
                </div>

                {variant === "compact" && (
                    <div className="mt-3 flex items-center justify-between">
                        <StatusBadge label={server.status} tone={server.tone} className="sm:hidden" />

                        <div className="flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-panel-faint">Manage</span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-3 text-panel-muted transition-colors group-hover:bg-primary-blue group-hover:text-white">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                        </div>

                        {onBookmark && <div className="flex h-6 items-center justify-end gap-2 opacity-0 group-hover:opacity-100 sm:hidden" />}
                    </div>
                )}

                {variant === "list" && (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={copyIp}
                                className="group/ip flex min-w-0 items-center gap-2 rounded-md border border-stroke bg-surface-2 px-2.5 py-1.5 text-xs font-mono text-panel-text transition-colors hover:border-stroke-strong"
                                title="Copy IP address"
                            >
                                <span className="truncate">{ip}</span>
                                {copied ? (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-success-green" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5 shrink-0 text-panel-faint group-hover/ip:text-panel-text" />
                                )}
                            </button>

                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-surface-2 text-panel-muted transition-all duration-200 group-hover:border-primary-blue/50 group-hover:bg-primary-blue-soft group-hover:text-primary-blue">
                                <ArrowUpRight className="h-4 w-4" />
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 border-t border-stroke pt-3 mt-auto">
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                                    <Cpu className="h-3 w-3" /> Compute
                                </div>
                                <p className="mt-1 text-sm font-semibold text-panel-text">
                                    {server.cpuCores > 0 ? `${server.cpuCores} vCPU` : "—"}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                                    <MemoryStick className="h-3 w-3" /> Memory
                                </div>
                                <p className="mt-1 text-sm font-semibold text-panel-text">
                                    {server.memoryTotalMb > 0 ? formatGib(server.memoryTotalMb / 1024, 1) : "—"}
                                    <span className="ml-1 text-[11px] font-medium text-panel-faint">
                                        {realMem > 0 ? `${Math.round(memPct)}% used` : "unmetered"}
                                    </span>
                                </p>
                            </div>
                        </div>
                        {realMem > 0 && server.memoryTotalMb > 0 && (
                            <ResourceBar value={realMem} max={server.memoryTotalMb} color="blue" height="sm" />
                        )}

                        <span
                            className="mt-1 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-primary-blue px-3 text-xs font-semibold text-white transition-colors group-hover:bg-primary-blue/90"
                        >
                            Manage Server
                        </span>
                    </>
                )}
            </Card>
        </Link>
    );
}

export default ServerCard;