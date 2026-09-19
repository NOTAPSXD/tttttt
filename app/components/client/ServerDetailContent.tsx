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
    Recycle,
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
import { ConfirmDialog } from "@/app/components/ui/dialog";
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
    boot: "Boot requested",
    shutdown: "Shutdown requested",
    powerOff: "Forced power-off requested",
    restart: "Restart requested",
};

const REBUILD_OSES = ["Ubuntu 24.04 LTS", "Ubuntu 22.04 LTS", "Debian 12", "AlmaLinux 9", "Rocky Linux 9"];

const STATUS_META: Record<ServerStatusLabel, { tone: "success" | "danger" | "info" | "muted" | "warning"; blurb: string }> = {
    RUNNING: { tone: "success", blurb: "Server is running and accepting connections." },
    STOPPED: { tone: "danger", blurb: "Server is shut down. Use Boot to start it." },
    OFFLINE: { tone: "danger", blurb: "Server is currently shut down or unable to report a state." },
    SUSPENDED: { tone: "warning", blurb: "This server has been suspended by an administrator." },
    PROVISIONING: { tone: "info", blurb: "The server is being provisioned on the provider." },
    UNKNOWN: { tone: "muted", blurb: "Live state could not be determined right now." },
};

function extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string } | undefined;
        if (data?.error) return data.error;
    }
    return "Something went wrong";
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
            {copied ? <Check className="h-3.5 w-3.5 text-success-green" /> : <Copy className="h-3.5 w-3.5" />}
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
    const [newPassword, setNewPassword] = useState<string | null>(null);

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

    const status = resolveServerStatus({
        providerType: providerType || "virtfusion",
        state: providerStateFromVfRaw(vfData),
        cachedStatus: initial.status,
        suspended: initial.suspended,
    }).label;
    const statusMeta = STATUS_META[status];
    const running = status === "RUNNING";
    const suspended = status === "SUSPENDED";

    // CPU
    const cpuPct = vfData ? clampPercent(parseCpuPercent(vfData.state?.cpu)) : null;
    const cpuCores = vfData ? parseCpuCoresSafe(vfData.state?.cpu, initial.cpuCores) : initial.cpuCores;

    // Memory
    const memTotalMb = (vfData ? parseMemoryMb(vfData.memory) : null) || initial.memoryTotalMb;
    const memRaw = vfData?.state?.memory ?? "";
    let memUsedMb = memRaw ? parseMemUsedMb(memRaw) : 0;
    let memPct: number | null = null;
    if (memRaw.includes("%")) {
        memPct = memUsedMb;
        memUsedMb = (memPct / 100) * memTotalMb;
    } else if (memTotalMb > 0 && memUsedMb > 0) {
        memPct = (memUsedMb / memTotalMb) * 100;
    }
    const memFreeMb = Math.max(0, memTotalMb - memUsedMb);

    // Network
    const ip = vfData?.network?.primary?.ipv4?.[0]?.address || initial.ip || null;
    const rxGb = (vfData?.state?.network?.primary?.traffic?.rx ?? 0) / (1024 * 1024 * 1024);
    const txGb = (vfData?.state?.network?.primary?.traffic?.tx ?? 0) / (1024 * 1024 * 1024);
    const totalGb = rxGb + txGb;

    // Location
    const loc = vfData?.network?.primary?.ipv4?.[0]?.location || initial.location || null;

    const runAction = async (a: PowerAction) => {
        setAction(a);
        try {
            await axios.post(`/api/vps/${serverId}/power`, { action: a });
            toast.success(POWER_TOAST[a], { description: `${name} · state is being refreshed` });
            setTimeout(() => refresh(), 1500);
        } catch (e) {
            toast.error(extractErrorMessage(e));
        } finally {
            setAction(null);
        }
    };

    const saveName = async () => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === initial.name) {
            setName(initial.name);
            return;
        }
        setSavingName(true);
        try {
            await axios.patch(`/api/vps/${serverId}/rename`, { name: trimmed });
            toast.success("Server renamed");
        } catch (e) {
            toast.error(extractErrorMessage(e));
            setName(initial.name);
        } finally {
            setSavingName(false);
        }
    };

    const resetPassword = async () => {
        setNewPassword(null);
        setPasswordOpen(true);
        try {
            const res = await axios.post<{ expectedPassword: string }>(`/api/vps/${serverId}/reset-password`);
            setNewPassword(res.data.expectedPassword);
        } catch (e) {
            setNewPassword(null);
            toast.error(extractErrorMessage(e));
        }
    };

    const doRebuild = async () => {
        // No provider endpoint exists yet — surface an honest notice.
        setRebuildOpen(false);
        toast.info("Rebuild is not available", {
            description: "The provider API does not expose OS rebuild yet. Please contact support.",
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
                            <h1 className="truncate text-xl font-bold text-panel-text md:text-2xl">{name}</h1>
                            <StatusBadge label={status} tone={statusMeta.tone} />
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-panel-muted">
                            <span className="font-mono">{ip || "no IP attached"}</span>
                            {pollError ? (
                                <span className="text-danger-red">· live sync failed</span>
                            ) : (
                                <span>
                                    · {lastUpdated ? `${Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s ago` : "syncing…"}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={refresh} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction("restart")}
                        loading={action === "restart"}
                        disabled={!running || suspended || action !== null}
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reboot
                    </Button>
                    <Button size="sm" variant="secondary" onClick={resetPassword} disabled={action !== null}>
                        <KeyRound className="h-3.5 w-3.5" /> Reset Password
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveTab("options")}>
                        <Settings className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-4">
                    <CardContent className="flex flex-col gap-3 p-0">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold text-panel-muted">
                                <Cpu className="h-4 w-4 text-primary-blue" /> CPU Usage
                            </span>
                            <span className="text-sm font-bold text-panel-text">{cpuPct !== null ? `${cpuPct}%` : "—"}</span>
                        </div>
                        <ResourceBar value={cpuPct ?? 0} max={100} color={cpuPct !== null && cpuPct > 90 ? "red" : "blue"} />
                        <p className="text-[11px] text-panel-muted">{cpuCores} core(s) allocated</p>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardContent className="flex flex-col gap-3 p-0">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold text-panel-muted">
                                <MemoryStick className="h-4 w-4 text-success-green" /> Memory Usage
                            </span>
                            <span className="text-sm font-bold text-panel-text">{memPct !== null ? `${memPct.toFixed(0)}%` : "—"}</span>
                        </div>
                        <ResourceBar value={memPct ?? 0} max={100} color={memPct !== null && memPct > 90 ? "red" : memPct !== null && memPct > 70 ? "amber" : "green"} />
                        <p className="text-[11px] text-panel-muted">
                            {formatBytes(memUsedMb * 1024 * 1024)} used · {formatBytes(memFreeMb * 1024 * 1024)} free
                        </p>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardContent className="flex flex-col gap-3 p-0">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold text-panel-muted">
                                <Activity className="h-4 w-4 text-[#f97316]" /> Network Traffic
                            </span>
                            <span className="text-sm font-bold text-panel-text">{formatGib(totalGb)}</span>
                        </div>
                        <div className="flex gap-4 text-[11px] text-panel-muted">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-sm bg-primary-blue" /> {formatGib(rxGb)} in
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-sm bg-[#f97316]" /> {formatGib(txGb)} out
                            </span>
                        </div>
                        <p className="text-[11px] text-panel-muted">Current billing cycle (provider tracked)</p>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardContent className="flex flex-col gap-2 p-0">
                        <span className="flex items-center gap-2 text-xs font-semibold text-panel-muted">
                            {status === "RUNNING" ? <CheckCircle2 className="h-4 w-4 text-success-green" /> : <ShieldOff className="h-4 w-4 text-panel-faint" />}
                            Server Status
                        </span>
                        <div className="flex items-center gap-2">
                            <StatusBadge label={status} tone={statusMeta.tone} />
                        </div>
                        <p className="text-[11px] text-panel-muted">{statusMeta.blurb}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Power controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Power className="h-4 w-4 text-primary-blue" /> Power Controls
                    </CardTitle>
                    <CardDescription>
                        Actions are sent to the provider. Shutdown is graceful; Power Off forces a stop.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                    {POWER_ACTIONS.map((b) => {
                        const disabled =
                            suspended || (b.needsRunning ? !running : running) || action !== null;
                        return (
                            <Button
                                key={b.key}
                                variant={b.danger ? "danger" : b.needsRunning ? "secondary" : "primary"}
                                size="sm"
                                loading={action === b.key}
                                disabled={disabled}
                                onClick={() => (b.key === "powerOff" ? setPowerOffOpen(true) : runAction(b.key))}
                            >
                                {b.icon} {b.label}
                            </Button>
                        );
                    })}
                    <ConfirmDialog
                        open={powerOffOpen}
                        onCancel={() => setPowerOffOpen(false)}
                        onConfirm={() => {
                            setPowerOffOpen(false);
                            runAction("powerOff");
                        }}
                        title="Force power off?"
                        description={`${name} will be forcibly stopped. Any unsaved data may be lost.`}
                        confirmLabel="Force stop"
                        danger
                    />
                    <Button variant="danger" className="ml-auto" onClick={() => setRebuildOpen(true)} disabled={action !== null}>
                        <Recycle className="h-4 w-4" /> Rebuild
                    </Button>
                    {suspended && (
                        <p className="text-[11px] text-warning-amber">Suspended servers cannot be controlled from your account.</p>
                    )}
                </CardContent>
            </Card>

            {/* Info row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <OsIcon os={initial.os.icon} size={30} />
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-panel-faint">Operating System</p>
                            <p className="truncate text-sm font-semibold text-panel-text">{initial.os.label}</p>
                            <p className="text-[11px] text-panel-muted">{vfData?.kernel || "—"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 shrink-0 text-primary-blue" />
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-panel-faint">Datacenter</p>
                            <p className="truncate text-sm font-semibold text-panel-text">{loc ?? "—"}</p>
                            <p className="text-[11px] text-panel-muted">Provider virtualized node</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 shrink-0 text-success-green" />
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-panel-faint">Loader</p>
                            <p className="truncate text-sm font-semibold text-panel-text">—</p>
                            <p className="text-[11px] text-panel-muted">Firmware type</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 shrink-0 text-warning-amber" />
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-panel-faint">Created</p>
                            <p className="truncate text-sm font-semibold text-panel-text">{formatDateTime(initial.created)}</p>
                            <p className="text-[11px] text-panel-muted">{initial.virtfusionId}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-stroke bg-surface p-1">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={cn(
                            "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                            activeTab === t.key ? "bg-surface-3 text-panel-text" : "text-panel-faint hover:text-panel-muted",
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <DetailTabs
                activeTab={activeTab}
                server={initial}
                vfData={vfData}
                serverId={serverId}
                name={name}
                setName={setName}
                onSaveName={saveName}
                savingName={savingName}
            />

            {/* Statistics */}
            <TaskTable
                tasks={(tasks ?? []).map((t) => ({
                    id: String(t.id || t.reference || t.type || `task-${Math.random().toString(36)}`),
                    serverId: initial.id,
                    serverName: initial.name,
                    type: String(t.type || t.name || t.reference || "Server task"),
                    status: String(t.status || "unknown"),
                    requestedAt: t.createdAt || t.startedAt ? new Date(t.createdAt || t.startedAt).toISOString() : null,
                    durationSeconds: typeof t.durationSeconds === "number" ? t.durationSeconds : null,
                }))}
                title="Server Statistics"
                description="Recent operations recorded for this server"
                emptyText="No tasks recorded yet."
                collapsible
            />

            {/* Rebuild dialog */}
            <ConfirmDialog
                open={rebuildOpen}
                onCancel={() => setRebuildOpen(false)}
                onConfirm={doRebuild}
                title="Rebuild server"
                description={`Reinstall ${name} with a fresh OS image. All existing data will be wiped. No backup will be taken automatically.`}
                confirmLabel="Continue"
                danger
            >
                <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-panel-muted">Choose operating system</p>
                    {REBUILD_OSES.map((o) => (
                        <label
                            key={o}
                            className={cn(
                                "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                                rebuildOs === o ? "border-primary-blue/60 bg-primary-soft text-panel-text" : "border-stroke bg-surface-2 text-panel-muted",
                            )}
                        >
                            {o}
                            <input
                                type="radio"
                                name="rebuild-os"
                                value={o}
                                checked={rebuildOs === o}
                                onChange={() => setRebuildOs(o)}
                                className="accent-primary-blue"
                            />
                        </label>
                    ))}
                    <p className="flex items-center gap-1.5 pt-2 text-[11px] text-panel-muted">
                        <Info className="h-3.5 w-3.5 shrink-0" /> Rebuild is queued on the provider; you'll be notified when reinstallation completes.
                    </p>
                </div>
            </ConfirmDialog>

            {/* Password dialog */}
            {passwordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPasswordOpen(false)}>
                    <div
                        className="w-full max-w-md rounded-xl border border-stroke bg-surface p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary-blue" />
                            <h3 className="text-base font-bold text-panel-text">New root password</h3>
                        </div>
                        {newPassword ? (
                            <div className="mt-4 rounded-lg border border-success-green/30 bg-success-soft p-4 text-center">
                                <p className="font-mono text-lg font-bold text-panel-text">{newPassword}</p>
                                <p className="mt-1 text-[11px] text-panel-muted">Also emailed to your account address.</p>
                                <div className="mt-3 flex justify-center">
                                    <CopyButton value={newPassword} label="Copy" />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-stroke bg-surface-2 p-4">
                                <RefreshCw className="h-4 w-4 animate-spin text-primary-blue" />
                                <p className="text-sm text-panel-muted">Requesting a new password from the provider…</p>
                            </div>
                        )}
                        <div className="mt-5 flex justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function parseCpuCoresSafe(raw: unknown, fallback: number): number {
    const s = String(raw ?? "");
    const m = s.match(/(\d+)\s*core/i);
    return m ? parseInt(m[1], 10) : fallback;
}