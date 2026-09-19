"use client";

import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { timeAgo } from "@/lib/clientserver";

export function NotificationsCard() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const recent = notifications.slice(0, 4);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-warning-amber" /> Notifications
                    </CardTitle>
                    <CardDescription>Recent activity on your account</CardDescription>
                </div>
                {unreadCount > 0 ? (
                    <Badge className="border-warning-amber/30 bg-warning-soft text-warning-amber">
                        {unreadCount} unread
                    </Badge>
                ) : (
                    <Badge className="border-stroke bg-surface-3 text-panel-muted">All read</Badge>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {recent.length === 0 ? (
                    <div className="p-6 text-center">
                        <BellOff className="mx-auto mb-2 h-5 w-5 text-panel-faint" />
                        <p className="text-sm text-panel-muted">No unread notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stroke">
                        {recent.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => {
                                    if (!n.read) markAsRead(n.id);
                                }}
                                className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/60"
                            >
                                <span
                                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                                        n.read ? "bg-surface-3" : "bg-primary-blue"
                                    }`}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-panel-text">{n.title}</p>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-panel-muted">{n.message}</p>
                                </div>
                                <span className="shrink-0 text-[10px] text-panel-faint">{timeAgo(n.timestamp.toISOString())}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default NotificationsCard;