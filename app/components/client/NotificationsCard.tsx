"use client";

import { useNotifications } from "@/app/contexts/NotificationContext";
import { Bell, CheckCheck } from "lucide-react";
import { Panel, PanelHeader, PanelTitle, StatusDot } from "@/app/components/ui/primitives";
import { timeAgo, ServerTone } from "@/lib/clientserver";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";

export { NotificationCenter as NotificationBell };

function typeTone(type?: string): ServerTone {
    switch (type) {
        case "success": return "success";
        case "error":   return "danger";
        case "warning": return "warning";
        case "info":    return "info";
        default:        return "muted";
    }
}

/**
 * CompactNotificationsPanel — rendered on empty dashboard state IF there are notifications.
 * If empty, returns null: "Don't give it a permanent card when empty."
 */
export function CompactNotificationsPanel() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    if (notifications.length === 0) {
        return null;
    }

    return (
        <Panel flush>
            <PanelHeader>
                <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-[#8b93a1]" aria-hidden="true" />
                    <PanelTitle>Notifications</PanelTitle>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-[#3b82f6]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#3b82f6]">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#8b93a1] hover:text-[#e6e8ec] transition-colors duration-150"
                        aria-label="Mark all notifications as read"
                    >
                        <CheckCheck className="h-3 w-3" aria-hidden="true" />
                        Mark all read
                    </button>
                )}
            </PanelHeader>

            <div className="max-h-[240px] overflow-y-auto divide-y divide-[#1f242d]">
                {notifications.slice(0, 5).map((n) => (
                    <button
                        key={n.id}
                        onClick={() => { if (!n.read) markAsRead(n.id); }}
                        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-[#141820] transition-colors duration-150"
                    >
                        <span className="mt-1 shrink-0">
                            <StatusDot tone={typeTone(n.type)} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={`text-[12px] truncate ${n.read ? "text-[#8b93a1]" : "font-medium text-[#e6e8ec]"}`}>
                                {n.title}
                            </p>
                            <p className="text-[11px] line-clamp-1 text-[#8b93a1]">
                                {n.message}
                            </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-[#8b93a1]">
                            {timeAgo(n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp)}
                        </span>
                    </button>
                ))}
            </div>
        </Panel>
    );
}

/**
 * NotificationsCard — legacy stub kept so existing imports don't break.
 * Returns null when empty.
 */
export function NotificationsCard() {
    return <CompactNotificationsPanel />;
}

export default NotificationsCard;
