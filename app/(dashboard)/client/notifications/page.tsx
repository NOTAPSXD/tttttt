"use client";

import Link from "next/link";
import { Bell, BellOff, CheckCheck, Trash2, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/ui/badge";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { NotificationType } from "@/app/contexts/NotificationContext";
import { cn } from "@/app/components/ui/button";

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; tone: "success" | "danger" | "info" | "warning"; chip: string }> = {
    success: { icon: <CheckCircle2 className="h-4 w-4" />, tone: "success", chip: "text-success-green" },
    error: { icon: <XCircle className="h-4 w-4" />, tone: "danger", chip: "text-danger-red" },
    info: { icon: <Info className="h-4 w-4" />, tone: "info", chip: "text-info-blue" },
    warning: { icon: <AlertTriangle className="h-4 w-4" />, tone: "warning", chip: "text-warning-amber" },
};

function timeLabel(d: Date): string {
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

    return (
        <div className="space-y-4 pb-24 md:pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-panel-text md:text-3xl">Notifications</h1>
                    <p className="mt-1 text-sm text-panel-muted">
                        {unreadCount > 0 ? `${unreadCount} unread · ${notifications.length} total` : `${notifications.length} notifications`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={unreadCount === 0} onClick={markAllAsRead}>
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger-red" disabled={notifications.length === 0} onClick={clearAll}>
                        <Trash2 className="h-3.5 w-3.5" /> Clear all
                    </Button>
                </div>
            </div>

            {notifications.length === 0 ? (
                <Card className="p-10 text-center">
                    <BellOff className="mx-auto mb-3 h-8 w-8 text-panel-faint" />
                    <h3 className="text-sm font-semibold text-panel-text">All caught up</h3>
                    <p className="mt-1 text-sm text-panel-muted">
                        Notifications about your servers will appear here.
                    </p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <ul className="divide-y divide-stroke">
                            {notifications.map((n) => {
                                const meta = TYPE_META[n.type];
                                return (
                                    <li key={n.id} className={cn("flex gap-3 px-4 py-3.5 transition-colors", !n.read ? "bg-primary-soft/30" : "")}>
                                        <span className={cn("mt-0.5 shrink-0", meta.chip)}>{meta.icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-panel-text">{n.title}</p>
                                                {!n.read && <StatusBadge label="New" tone={meta.tone} />}
                                            </div>
                                            <p className="mt-0.5 text-xs text-panel-muted">
                                                {n.serverName ? (
                                                    <>
                                                        <Link href={`/client/servers/${n.serverId}`} className="font-semibold text-primary-blue hover:underline">
                                                            {n.serverName}
                                                        </Link>
                                                        {" · "}
                                                    </>
                                                ) : null}
                                                {n.message}
                                            </p>
                                            <p className="mt-1 text-[11px] text-panel-faint">{timeLabel(n.timestamp)}</p>
                                        </div>
                                        {!n.read && (
                                            <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>
                                                <Bell className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}