"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
    Plus,
    Trash2,
    RotateCcw,
    HardDrive,
    Users,
    Disc3 as MediaIcon,
    Settings,
    Globe,
    Info,
    ArrowDownToLine,
    ArrowUpFromLine,
    Database,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/ui/badge";
import { ResourceBar } from "@/app/components/ui/progress";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
    ClientServer,
    clampPercent,
    formatBytes,
    formatGib,
} from "@/lib/clientserver";

export type DetailTab = "overview" | "network" | "storage" | "backups" | "sharing" | "media" | "options";

export interface DetailTabsProps {
    activeTab: DetailTab;
    server: ClientServer;
    vfData: Record<string, any> | null;
    serverId: string;
    name: string;
    setName: (v: string) => void;
    onSaveName: () => void;
    savingName: boolean;
}

// ── Reusable info row ────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-panel-muted">{label}</span>
            <span className={`text-sm text-panel-text ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
        </div>
    );
}

// ── Network tab ──────────────────────────────────────────────

interface NetworkParams {
    ip: string | null;
    rxGb: number;
    txGb: number;
    totalGb: number;
    allowanceGb: number | null;
}

function NetworkTab({ server, vfData, network }: { server: ClientServer; vfData: Record<string, any> | null; network: NetworkParams }) {
    const inPct = network.rxGb + network.txGb > 0 ? (network.rxGb / (network.rxGb + network.txGb)) * 100 : 0;
    const usedBytes = network.totalGb * 1024 * 1024 * 1024;
    const allowBytes = network.allowanceGb != null ? network.allowanceGb * 1024 * 1024 * 1024 : null;
    const freeBytes = allowBytes != null ? Math.max(0, allowBytes - usedBytes) : null;
    const percentUsed = network.allowanceGb != null ? clampPercent((network.totalGb / network.allowanceGb) * 100) : 0;

    const rows: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = [
        {
            label: "Inbound",
            value: `${formatGib(network.rxGb)}`,
            icon: <ArrowDownToLine className="h-3.5 w-3.5 text-primary-blue" />,
        },
        {
            label: "Outbound",
            value: `${formatGib(network.txGb)}`,
            icon: <ArrowUpFromLine className="h-3.5 w-3.5 text-[#f97316]" />,
        },
        { label: "Total", value: `${formatGib(network.totalGb)}`, icon: <Database className="h-3.5 w-3.5 text-success-green" /> },
        { label: "Inbound speed", value: "—", icon: <Info className="h-3.5 w-3.5" /> },
        { label: "Outbound speed", value: "—", icon: <Info className="h-3.5 w-3.5" /> },
        {
            label: "Allowance",
            value: network.allowanceGb != null ? (
                <StatusBadge label={formatGib(network.allowanceGb, 0)} tone="info" />
            ) : (
                "—"
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>IP Addresses</CardTitle>
                    <CardDescription>Primary address attached to this server</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-stroke bg-surface-2 px-3 py-2.5">
                        <span className="font-mono text-sm text-panel-text">{network.ip || "—"}</span>
                        <StatusBadge label="Primary" tone="info" />
                    </div>
                    {(vfData?.network?.primary?.ipv4 ?? []).slice(1).map((net: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-stroke bg-surface-2 px-3 py-2.5">
                            <span className="font-mono text-sm text-panel-muted">{net.address}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Traffic Overview</CardTitle>
                    <CardDescription>Breakdown of the current billing cycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-28 w-28 shrink-0">
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: `conic-gradient(#3b82f6 ${inPct * 3.6}deg, #f97316 ${inPct * 3.6}deg 360deg)`,
                                }}
                            />
                            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-surface">
                                <span className="text-center text-[10px] font-bold text-panel-muted">
                                    {inPct.toFixed(0)}%
                                    <br />
                                    <span className="text-panel-faint">in</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-xs">
                            <div className="flex items-center gap-2 text-panel-muted">
                                <span className="h-2.5 w-2.5 rounded-sm bg-primary-blue" /> Inbound
                            </div>
                            <div className="flex items-center gap-2 text-panel-muted">
                                <span className="h-2.5 w-2.5 rounded-sm bg-[#f97316]" /> Outbound
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-stroke">
                        {rows.map((r) => (
                            <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="flex items-center gap-2 text-xs text-panel-muted">
                                    {r.icon} {r.label}
                                </span>
                                <span className="text-sm font-medium text-panel-text">{r.value}</span>
                            </div>
                        ))}
                    </div>

                    {network.allowanceGb != null && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                <span className="text-panel-muted">
                                    {formatGib(network.totalGb)} of {formatGib(network.allowanceGb)} used
                                </span>
                                <span className="font-semibold text-panel-text">{percentUsed.toFixed(1)}%</span>
                            </div>
                            <ResourceBar
                                value={percentUsed}
                                max={100}
                                color={percentUsed > 90 ? "red" : percentUsed > 70 ? "amber" : "green"}
                            />
                            {freeBytes != null && (
                                <p className="mt-1.5 text-[11px] text-panel-muted">
                                    {formatBytes(freeBytes)} free · cycle range — (shown by provider)
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Storage tab ──────────────────────────────────────────────

function StorageTab({ vfData }: { vfData: Record<string, any> | null }) {
    const disks = vfData?.storage?.length ? vfData.storage : [];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-panel-muted">{disks.length} disk(s) attached</p>
            </div>
            {disks.length === 0 ? (
                <Card className="p-10 text-center">
                    <HardDrive className="mx-auto mb-2 h-6 w-6 text-panel-faint" />
                    <p className="text-sm text-panel-muted">No storage details available from the provider.</p>
                </Card>
            ) : (
                disks.map((d: any, i: number) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-surface-2 text-panel-muted">
                                    <HardDrive className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-panel-text">Disk {i + 1}</p>
                                    <p className="text-[11px] text-panel-muted">
                                        {d.primary ? "Boot disk · primary" : "Additional disk"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-panel-text">{d.capacity || "—"}</span>
                                {d.primary && <StatusBadge label="Boot" tone="info" />}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => toast.info("Resize is managed on the provider")}>
                                Resize
                            </Button>
                            <Button size="sm" variant="ghost" className="text-danger-red" onClick={() => toast.info("Disk ejection is managed on the provider")}>
                                Eject
                            </Button>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}

// ── Backups tab ──────────────────────────────────────────────

interface BackupItem {
    id: string;
    name: string;
    size: string;
    createdAt: string;
    status: string;
}

function BackupsTab({ serverId }: { serverId: string }) {
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get<BackupItem[]>(`/api/vps/${serverId}/backups`);
            setBackups(res.data);
        } catch {
            toast.error("Could not load backups");
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    useEffect(() => {
        load();
    }, [load]);

    const createBackup = async () => {
        setAction("create");
        try {
            const res = await axios.post(`/api/vps/${serverId}/backups`);
            toast.success("Backup creation initiated", { description: (res.data as any)?.message });
            load();
        } catch {
            toast.error("Could not create backup");
        } finally {
            setAction(null);
        }
    };

    const restore = async (id: string) => {
        setAction(id);
        try {
            await axios.post(`/api/vps/${serverId}/backups/${id}/restore`);
            toast.success("Backup restore initiated");
        } catch {
            toast.error("Could not restore backup");
        } finally {
            setAction(null);
        }
    };

    const remove = async (id: string) => {
        setAction(id);
        try {
            await axios.delete(`/api/vps/${serverId}/backups/${id}`);
            setBackups((prev) => prev.filter((b) => b.id !== id));
            toast.success("Backup deleted");
        } catch {
            toast.error("Could not delete backup");
        } finally {
            setAction(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-panel-muted">{backups.length} backup(s)</p>
                <Button size="sm" variant="primary" loading={action === "create"} onClick={createBackup}>
                    <Plus className="h-3.5 w-3.5" /> Create backup
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <Card key={i} className="p-4">
                            <CardContent className="flex flex-col gap-3 p-0 sm:flex-row sm:items-center">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="ml-auto h-8 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : backups.length === 0 ? (
                <Card className="p-10 text-center">
                    <HardDrive className="mx-auto mb-2 h-6 w-6 text-panel-faint" />
                    <p className="text-sm text-panel-muted">No backups yet. Create your first backup snapshot.</p>
                </Card>
            ) : (
                backups.map((b) => (
                    <Card key={b.id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-panel-text">{b.name}</p>
                                <p className="mt-0.5 text-[11px] text-panel-muted">
                                    {b.size} · {new Date(b.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge label={b.status} tone={b.status === "completed" ? "success" : "info"} />
                                <Button size="sm" variant="secondary" loading={action === b.id} onClick={() => restore(b.id)}>
                                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                                </Button>
                                <Button size="sm" variant="ghost" className="text-danger-red" loading={action === `del-${b.id}`} onClick={() => remove(b.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}

// ── Sharing tab ──────────────────────────────────────────────

function SharingTab() {
    return (
        <Card className="p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
            <h3 className="text-sm font-semibold text-panel-text">Server sharing is not enabled</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-panel-muted">
                Inviting other users to this server requires provider-side sharing support. Contact your administrator
                if you need delegated access.
            </p>
        </Card>
    );
}

// ── Media tab ────────────────────────────────────────────────

function MediaTab() {
    return (
        <Card className="p-10 text-center">
            <MediaIcon className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
            <h3 className="text-sm font-semibold text-panel-text">No ISO media mounted</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-panel-muted">
                ISO mounts are managed by administrators on the provider. When a mount is active it will appear here with
                a boot option.
            </p>
        </Card>
    );
}

// ── Options tab ──────────────────────────────────────────────

function OptionsTab({ name, setName, onSaveName, savingName }: {
    name: string;
    setName: (v: string) => void;
    onSaveName: () => void;
    savingName: boolean;
}) {
    return (
        <div className="space-y-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary-blue" /> Server configuration
                    </CardTitle>
                    <CardDescription>Display name shown across the control panel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-panel-muted">
                            Display name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 w-full rounded-lg border border-stroke bg-surface-2 px-3 text-sm text-panel-text outline-none focus:border-primary-blue/60"
                            placeholder="My VPS"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button variant="primary" size="sm" loading={savingName} onClick={onSaveName}>
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary-blue" /> Hostname & rDNS
                    </CardTitle>
                    <CardDescription>Managed by the provider — changes here take effect after a reboot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow label="Hostname" value="—" mono />
                    <InfoRow label="Reverse DNS (PTR)" value="—" mono />
                    <InfoRow label="Loader" value="—" />
                </CardContent>
            </Card>
        </div>
    );
}

// ── Dispatcher ───────────────────────────────────────────────

export function DetailTabs({ activeTab, server, vfData, serverId, name, setName, onSaveName, savingName }: DetailTabsProps) {
    const ip = vfData?.network?.primary?.ipv4?.[0]?.address || server.ip || null;
    const rxGb = (vfData?.state?.network?.primary?.traffic?.rx || 0) / (1024 * 1024 * 1024);
    const txGb = (vfData?.state?.network?.primary?.traffic?.tx || 0) / (1024 * 1024 * 1024);
    const totalGb = (vfData?.state?.network?.primary?.traffic?.total || 0) / (1024 * 1024 * 1024);

    let allowanceGb: number | null = null;
    const limit = vfData?.network?.primary?.limit;
    if (limit) {
        const num = parseFloat(String(limit));
        if (!Number.isNaN(num)) allowanceGb = String(limit).toUpperCase().includes("TB") ? num * 1024 : num;
    }

    const network: NetworkParams = {
        ip,
        rxGb,
        txGb,
        totalGb,
        allowanceGb,
    };

    switch (activeTab) {
        case "network":
            return <NetworkTab server={server} vfData={vfData} network={network} />;
        case "storage":
            return <StorageTab vfData={vfData} />;
        case "backups":
            return <BackupsTab serverId={serverId} />;
        case "sharing":
            return <SharingTab />;
        case "media":
            return <MediaTab />;
        case "options":
            return <OptionsTab name={name} setName={setName} onSaveName={onSaveName} savingName={savingName} />;
        default:
            return null;
    }
}

export default DetailTabs;