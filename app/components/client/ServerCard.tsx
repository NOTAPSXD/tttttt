"use client";

import Link from "next/link";
import { Bookmark, ArrowUpRight, Copy, Check, Cpu, MemoryStick } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusDot } from "@/app/components/ui/primitives";
import OsIcon from "@/app/components/client/OsIcon";
import { ClientServer, formatGib } from "@/lib/clientserver";

interface ServerCardProps {
    server: ClientServer;
    variant?: "compact" | "list";
    onBookmark?: (id: string, bookmarked: boolean) => void;
}

/* ── Skeleton matching final layout with 0 layout shift ── */
export function ServerCardSkeleton({ variant = "compact" }: { variant?: "compact" | "list" }) {
    return (
        <div
            className="rounded-[8px] bg-[#11141a] p-4.5 border border-[#1f242d]"
            aria-hidden="true"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-[8px] bg-[#1f242d] animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="h-3.5 w-28 rounded bg-[#1f242d] animate-pulse" />
                        <div className="h-2.5 w-20 rounded bg-[#1f242d] animate-pulse" />
                    </div>
                </div>
                <div className="h-5 w-16 rounded-[4px] bg-[#1f242d] animate-pulse" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#1f242d] pt-3">
                <div className="h-6 w-28 rounded bg-[#1f242d] animate-pulse" />
                <div className="h-6 w-16 rounded bg-[#1f242d] animate-pulse" />
            </div>
        </div>
    );
}

/* ── Polished Server Card ── */
export function ServerCard({ server, variant = "compact", onBookmark }: ServerCardProps) {
    const [copied, setCopied] = useState(false);
    const ip   = server.ip || "-";
    const href = `/client/servers/${server.id}`;

    const realMem = server.state?.memUsedMb ?? 0;
    const memPct  = server.memoryTotalMb > 0 ? (realMem / server.memoryTotalMb) * 100 : 0;

    const copyIp = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!server.ip) return;
        try {
            await navigator.clipboard.writeText(server.ip);
            setCopied(true);
            toast.success("IP address copied", { description: server.ip });
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Could not copy IP address");
        }
    };

    // Standard internal statuses: Online, Offline, Provisioning, Suspended
    const displayStatus =
        server.status === "RUNNING" ? "Online" :
        server.status === "STOPPED" || server.status === "OFFLINE" ? "Offline" :
        server.status === "SUSPENDED" ? "Suspended" : "Provisioning";

    const statusTone =
        displayStatus === "Online" ? "online" :
        displayStatus === "Offline" ? "offline" :
        displayStatus === "Suspended" ? "suspended" : "provisioning";

    return (
        <div
            className="group relative flex flex-col justify-between rounded-[8px] bg-[#11141a] p-4.5 border border-[#1f242d] transition-colors duration-150 hover:border-[#2c3448]"
        >
            {/* Top row: OS Icon + Name + Location + Status Dot/Label */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#0a0c10] border border-[#1f242d]">
                        <OsIcon os={server.os.icon} />
                    </div>
                    <div className="min-w-0">
                        <Link
                            href={href}
                            className="block text-[13px] font-semibold text-[#e6e8ec] hover:text-[#3b82f6] transition-colors duration-150 truncate focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none rounded"
                        >
                            {server.name}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8b93a1]">
                            <span>{server.locationFlag}</span>
                            <span className="truncate">{server.location}</span>
                            {server.cpuCores > 0 && (
                                <>
                                    <span className="text-[#1f242d]">·</span>
                                    <span>{server.cpuCores} vCPU</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Status + Bookmark */}
                <div className="flex shrink-0 items-center gap-2">
                    {onBookmark && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onBookmark(server.id, !server.bookmarked);
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none ${
                                server.bookmarked
                                    ? "bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]"
                                    : "bg-transparent border-[#1f242d] text-[#8b93a1] hover:text-[#e6e8ec]"
                            }`}
                            aria-label={server.bookmarked ? "Remove bookmark" : "Bookmark this server"}
                        >
                            <Bookmark
                                className="h-3 w-3"
                                style={{ fill: server.bookmarked ? "currentColor" : "none" }}
                            />
                        </button>
                    )}

                    {/* Status dot + text label (never color alone) */}
                    <div
                        className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#0a0c10] px-2 py-1 text-[11px] font-medium text-[#e6e8ec] border border-[#1f242d]"
                    >
                        <StatusDot tone={statusTone} pulse={displayStatus === "Online"} />
                        <span>{displayStatus}</span>
                    </div>
                </div>
            </div>

            {/* Middle: IP row with Copy button */}
            <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#1f242d] pt-3">
                <button
                    type="button"
                    onClick={copyIp}
                    className="inline-flex items-center gap-2 rounded-[6px] bg-[#0a0c10] px-2.5 py-1 text-[11px] font-mono text-[#e6e8ec] hover:text-white border border-[#1f242d] hover:border-[#2c3448] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[30px]"
                    aria-label={`Copy server IP address: ${ip}`}
                >
                    <span>{ip}</span>
                    {copied ? (
                        <Check className="h-3 w-3 text-[#22c55e]" aria-hidden="true" />
                    ) : (
                        <Copy className="h-3 w-3 text-[#8b93a1]" aria-hidden="true" />
                    )}
                </button>

                <div className="flex items-center gap-3 text-[11px] text-[#8b93a1]">
                    <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-[#8b93a1]" aria-hidden="true" />
                        {server.cpuCores > 0 ? `${server.cpuCores} vCPU` : "-"}
                    </span>
                    <span className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3 text-[#8b93a1]" aria-hidden="true" />
                        {server.memoryTotalMb > 0 ? formatGib(server.memoryTotalMb / 1024, 0) : "-"}
                    </span>
                </div>
            </div>

            {/* Footer / Quick Actions */}
            <div className="mt-3 pt-2 flex items-center justify-between">
                {realMem > 0 && server.memoryTotalMb > 0 ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8b93a1]">
                        <span>RAM:</span>
                        <div className="w-16 h-1.5 rounded-full bg-[#1f242d] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#3b82f6]"
                                style={{ width: `${Math.min(100, Math.round(memPct))}%` }}
                            />
                        </div>
                        <span className="font-mono text-[#e6e8ec]">{Math.round(memPct)}%</span>
                    </div>
                ) : (
                    <div />
                )}

                <Link
                    href={href}
                    className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none rounded min-h-[44px] py-2 px-1"
                >
                    <span>Manage</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}

export default ServerCard;
