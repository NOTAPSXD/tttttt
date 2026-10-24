"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
    RefreshCw,
    RotateCcw,
    KeyRound,
    Settings,
    Play,
    Square,
    Power,
    Copy,
    Check,
    Cpu,
    MemoryStick,
    Activity,
    MapPin,
    Calendar,
    Monitor,
    ShieldOff,
    Info,
    CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/ui/badge";
import { ResourceBar } from "@/app/components/ui/progress";
import { ConfirmDialog, DestructiveActionDialog } from "@/app/components/ui/dialog";
import OsIcon from "@/app/components/client/OsIcon";
import { DetailTabs, DetailTab } from "@/app/components/client/DetailTabs";
import { TaskTable } from "@/app/components/client/TaskTable";
import { usePolling } from "@/app/hooks/usePolling";
import {
    ClientServer,
    ServerStatusLabel,
    resolveServerStatus,
    providerStateFromVfRaw,
    clampPercent,
    parseCpuPercent,
    parseMemoryMb,
    parseMemUsedMb,
    formatBytes,
    formatGib,
    formatDateTime,
    locationLabel,
} from "@/lib/clientserver";
import { cn } from "@/app/components/ui/button";

interface ServerDetailContentProps {
    serverId: string;
    initial: ClientServer;
    providerType?: string | null;
}

type PowerAction = "boot" | "shutdown" | "powerOff" | "restart";

const POWER_ACTIONS: Array<{ key: PowerAction; label: string; icon: React.ReactNode; needsRunning: boolean; danger?: boolean }> = [
    { key: "boot", label: "Boot", icon: <Play className="h-4 w-4" />, needsRunning: false },
    { key: "restart", label: "Restart", icon: <RotateCcw className="h-4 w-4" />, needsRunning: true },
    { key: "shutdown", label: "Shutdown", icon: <Square className="h-4 w-4" />, needsRunning: true },
    { key: "powerOff", label: "Power Off", icon: <Power className="h-4 w-4" />, needsRunning: true, danger: true },
];

const POWER_TOAST: Record<PowerAction, string> = {
    boot: "Boot request queued",
    shutdown: "Shutdown request queued",
    powerOff: "Forced power-off request queued",
    restart: "Restart request queued",
};

const REBUILD_OSES = ["Ubuntu 24.04 LTS", "Ubuntu 22.04 LTS", "Debian 12", "AlmaLinux 9", "Rocky Linux 9"];

const STATUS_META: Record<string, { tone: "online" | "offline" | "provisioning" | "suspended" | "warning"; label: string; blurb: string }> = {
    RUNNING: { tone: "online", label: "Online", blurb: "Server is online and operating normally." },
    STOPPED: { tone: "offline", label: "Offline", blurb: "Server is shut down. Use Boot to start it." },
    OFFLINE: { tone: "offline", label: "Offline", blurb: "Server is currently offline." },
    SUSPENDED: { tone: "suspended", label: "Suspended", blurb: "This server is currently suspended." },
    PROVISIONING: { tone: "provisioning", label: "Provisioning", blurb: "The server is currently provisioning." },
    UNKNOWN: { tone: "offline", label: "Offline", blurb: "Server status is offline or unavailable." },
};

function extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string } | undefined;
        if (data?.error) return data.error;
    }
    return "Action could not be completed";
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    toast.success(`${label} copied to clipboard`);
                    setTimeout(() => setCopied(false), 1500);
                } catch {
                    toast.error("Could not copy to clipboard");
                }
            }}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : label}
        </Button>
    );
}

export default function ServerDetailContent({ serverId, initial, providerType }: ServerDetailContentProps) {
    const [vfData, setVfData] = useState<Record<string, any> | null>(initial.vfDetails);
    const [name, setName] = useState(initial.name);
    const [savingName, setSavingName] = useState(false);
    const [activeTab, setActiveTab] = useState<DetailTab>("overview");
    const [action, setAction] = useState<PowerAction | null>(null);
    const [powerOffOpen, setPowerOffOpen] = useState(false);
    const [rebuildOpen, setRebuildOpen] = useState(false);
    const [rebuildOs, setRebuildOs] = useState(REBUILD_OSES[0]);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [passwordDispatched, setPasswordDispatched] = useState(false);

    const { data: polled, error: pollError, lastUpdated, refresh } = usePolling(
        async () => {
            const res = await axios.get<Record<string, any>>(`/api/vps/${serverId}/stats`);
            return res.data;
        },
        5000,
        true,
    );

    const { data: tasks } = usePolling<Record<string, any>[]>(
        async () => {
            try {
                const res = await axios.get<Record<string, any>[]>(`/api/vps/${serverId}/tasks`);
                return res.data;
            } catch {
                return [];
            }
        },
        10000,
        true,
    );

    useEffect(() => {
        if (polled) setVfData(polled);
    }, [polled]);

    const rawStatus = resolveServerStatus({
        providerType: providerType || "virtfusion",
        state: providerStateFromVfRaw(vfData),
        cachedStatus: initial.status,
        suspended: initial.suspended,
    }).label;

    const statusMeta = STATUS_META[rawStatus] || STATUS_META.UNKNOWN;
    const isRunning = statusMeta.tone === "online";
    const isSuspended = initial.suspended || statusMeta.tone === "suspended";

    // Telemetry parsing
    const liveStats = (vfData?.stats as Record<string, any> | undefined) || {};
    const cpuPct = clampPercent(parseCpuPercent(liveStats.cpu ?? vfData?.cpuUsage));
    const memTotalMb = parseMemoryMb(vfData?.memory ?? initial.memoryTotalMb);
    const memUsedMb = parseMemUsedMb(liveStats.memory ?? vfData?.memoryUsed ?? 0);
    const memPct = memTotalMb > 0 ? clampPercent(Math.round((memUsedMb / memTotalMb) * 100)) : 0;

    const diskTotalGb = Math.max(0, Math.round(Number(initial.storageTotalGb ?? 0)));
    const diskUsedGb = Math.min(diskTotalGb, Math.max(0, Math.round(Number(initial.storageUsedGb ?? 0))));
    const diskPct = diskTotalGb > 0 ? clampPercent(Math.round((diskUsedGb / diskTotalGb) * 100)) : 0;

    const ip = initial.ip || (Array.isArray(vfData?.ips) ? vfData?.ips[0] : "") || "";
    const loc = locationLabel(initial.location);
    const cores = parseCpuCoresSafe(initial.cpuCores, 1);

    const handlePower = async (pAction: PowerAction) => {
        if (pAction === "powerOff") {
            setPowerOffOpen(true);
            return;
        }
        await executePower(pAction);
    };

    const executePower = async (pAction: PowerAction) => {
        setAction(pAction);
        try {
            await axios.post(`/api/vps/${serverId}/power`, { action: pAction });
            toast.success(POWER_TOAST[pAction]);
            setTimeout(() => refresh(), 1200);
        } catch (e) {
            toast.error(extractErrorMessage(e));
        } finally {
            setAction(null);
            setPowerOffOpen(false);
        }
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name === initial.name) return;
        setSavingName(true);
        try {
            await axios.post(`/api/vps/${serverId}/rename`, { name: name.trim() });
            toast.success("Server renamed successfully");
        } catch (e) {
            toast.error(extractErrorMessage(e));
            setName(initial.name);
        } finally {
            setSavingName(false);
        }
    };

    const resetPassword = async () => {
        setResettingPassword(true);
        setPasswordDispatched(false);
        setPasswordOpen(true);
        try {
            await axios.post(`/api/vps/${serverId}/reset-password`);
            setPasswordDispatched(true);
            toast.success("Password reset instructions dispatched");
        } catch (e) {
            toast.error(extractErrorMessage(e));
            setPasswordOpen(false);
        } finally {
            setResettingPassword(false);
        }
    };

    const doRebuild = async () => {
        setRebuildOpen(false);
        toast.info("OS Rebuild", {
            description: "Operating system reinstallation has been requested. You will receive an update once finished.",
        });
    };

    const tabs: Array<{ key: DetailTab; label: string }> = [
        { key: "overview", label: "Overview" },
        { key: "network", label: "Network" },
        { key: "storage", label: "Storage" },
        { key: "backups", label: "Backups" },
        { key: "sharing", label: "Sharing" },
        { key: "media", label: "Media" },
        { key: "options", label: "Options" },
    ];

    return (
        <div className="space-y-5 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <OsIcon os={initial.os.icon} size={40} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-xl font-bold text-[#e6e8ec] tracking-tight md:text-2xl">{name}</h1>
                            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8b93a1]">
                            <span className="font-mono">{ip || "No IP attached"}</span>
                            {pollError ? (
                                <span className="text-red-400">· Telemetry offline</span>
                            ) : (
                                <span>
                                    · {lastUpdated ? `Updated ${Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s ago` : "Connecting…"}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => refresh()}
                        loading={Boolean(action)}
                        title="Refresh status"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Suspended Alert banner */}
            {isSuspended && (
                <div
                    className="flex items-center gap-3 rounded-[8px] border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300"
                    role="alert"
                >
                    <ShieldOff className="h-5 w-5 shrink-0 text-amber-400" />
                    <div>
                        <p className="font-bold">Server Suspended</p>
                        <p className="text-amber-200/80">
                            This node is inactive. Control operations and network access are suspended. Contact support for assistance.
                        </p>
                    </div>
                </div>
            )}

            {/* Status card banner */}
            <Card className="border-stroke bg-surface">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#8b93a1]">Status</span>
                            <span className="text-sm font-semibold text-[#e6e8ec]">{statusMeta.label}</span>
                        </div>
                        <p className="text-xs text-[#8b93a1]">{statusMeta.blurb}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {POWER_ACTIONS.map((pa) => {
                            const disabled =
                                Boolean(action) ||
                                isSuspended ||
                                (pa.needsRunning && !isRunning) ||
                                (!pa.needsRunning && isRunning);
                            return (
                                <Button
                                    key={pa.key}
                                    size="sm"
                                    variant={pa.danger ? "danger" : "secondary"}
                                    disabled={disabled}
                                    loading={action === pa.key}
                                    onClick={() => handlePower(pa.key)}
                                >
                                    {pa.icon}
                                    <span>{pa.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Metric Meters */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between text-xs text-[#8b93a1]">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                <Cpu className="h-3.5 w-3.5" /> CPU
                            </span>
                            <span className="font-mono text-sm font-bold text-[#e6e8ec]">{cpuPct}%</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <ResourceBar value={cpuPct} tone={cpuPct > 85 ? "danger" : cpuPct > 60 ? "warning" : "info"} />
                        <p className="text-[11px] text-[#8b93a1]">{cores} vCPU core{cores > 1 ? "s" : ""}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between text-xs text-[#8b93a1]">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                <MemoryStick className="h-3.5 w-3.5" /> Memory
                            </span>
                            <span className="font-mono text-sm font-bold text-[#e6e8ec]">{memPct}%</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <ResourceBar value={memPct} tone={memPct > 85 ? "danger" : memPct > 60 ? "warning" : "success"} />
                        <p className="text-[11px] text-[#8b93a1]">
                            {memUsedMb > 0 ? `${formatGib(memUsedMb / 1024)} / ` : ""}
                            {formatGib(memTotalMb / 1024)} allocated
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between text-xs text-[#8b93a1]">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                <Activity className="h-3.5 w-3.5" /> Disk
                            </span>
                            <span className="font-mono text-sm font-bold text-[#e6e8ec]">{diskPct}%</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <ResourceBar value={diskPct} tone={diskPct > 90 ? "danger" : "info"} />
                        <p className="text-[11px] text-[#8b93a1]">
                            {diskTotalGb > 0 ? `${diskUsedGb} GB of ${diskTotalGb} GB` : "Quota configured"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Panel */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Server Management</CardTitle>
                    <CardDescription>Administrative controls and identity configurations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Rename */}
                    <form onSubmit={handleRename} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-9 w-full rounded-lg border border-[#1f242d] bg-[#0a0c10] px-3 text-sm text-[#e6e8ec] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                                placeholder="Server hostname"
                                disabled={savingName}
                            />
                        </div>
                        <Button type="submit" size="sm" variant="secondary" loading={savingName} disabled={name === initial.name}>
                            Save Hostname
                        </Button>
                    </form>

                    {/* Root Password & Rebuild */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1f242d]">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={resetPassword}
                            disabled={isSuspended}
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>Reset Root Password</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setRebuildOpen(true)}
                            disabled={isSuspended}
                        >
                            <span>Rebuild OS</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for deep details */}
            <DetailTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={tabs}
                server={initial}
                vfData={vfData}
            />

            {/* Recent Tasks */}
            <TaskTable
                tasks={(tasks || []).map((t: any) => ({
                    id: String(t.id || t._id || Math.random()),
                    action: String(t.action || t.type || "Operation"),
                    status: (t.status === "complete" || t.status === "SUCCESS") ? "complete" : (t.status === "failed" || t.status === "FAILED") ? "failed" : "running",
                    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
                    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
                    error: t.error || t.message,
                }))}
                title="Activity Log"
                description="Recorded operations and lifecycle events"
                emptyText="No recent operations recorded."
                collapsible
            />

            {/* Forced Power-Off Destructive Dialog */}
            <DestructiveActionDialog
                open={powerOffOpen}
                onCancel={() => setPowerOffOpen(false)}
                onConfirm={() => executePower("powerOff")}
                title="Force Power Off"
                description={`This immediately cuts power to ${name}. Unsaved data in cache may be corrupted. For a clean stop, use graceful Shutdown.`}
                confirmLabel="Force Power Off"
                matchPhrase={name}
                loading={action === "powerOff"}
            />

            {/* Rebuild OS Destructive Dialog */}
            <DestructiveActionDialog
                open={rebuildOpen}
                onCancel={() => setRebuildOpen(false)}
                onConfirm={doRebuild}
                title="Rebuild Server"
                description={`Rebuilding ${name} wipes the primary storage volume and installs a fresh operating system image. All existing files will be permanently lost.`}
                confirmLabel="Confirm Rebuild"
                matchPhrase="REBUILD"
            />

            {/* Safe Password Notification Dialog */}
            <ConfirmDialog
                open={passwordOpen}
                onCancel={() => setPasswordOpen(false)}
                onConfirm={() => setPasswordOpen(false)}
                title="Root Password Reset"
                confirmLabel="Done"
                cancelLabel="Close"
            >
                <div className="py-2 text-sm text-[#8b93a1] space-y-3">
                    {resettingPassword ? (
                        <div className="flex items-center gap-2.5 py-4 text-center justify-center">
                            <RefreshCw className="h-4 w-4 animate-spin text-[#3b82f6]" />
                            <span>Requesting password rotation…</span>
                        </div>
                    ) : passwordDispatched ? (
                        <div className="rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4" /> Password Reset Requested
                            </p>
                            <p className="text-[12px] text-[#8b93a1]">
                                A secure credential notification has been dispatched to your verified account email address.
                            </p>
                        </div>
                    ) : (
                        <p>Initiating credential reset...</p>
                    )}
                </div>
            </ConfirmDialog>
        </div>
    );
}

function parseCpuCoresSafe(raw: unknown, fallback: number): number {
    const s = String(raw ?? "");
    const m = s.match(/(\d+)\s*core/i);
    return m ? parseInt(m[1], 10) : fallback;
}
