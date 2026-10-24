"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { timeAgo } from "@/lib/clientserver";
import type { ServerTone } from "@/lib/clientserver";
import { StatusDot } from "@/app/components/ui/primitives";

function typeTone(type?: string): ServerTone {
    switch (type) {
        case "success": return "success";
        case "error":   return "danger";
        case "warning": return "warning";
        case "info":    return "info";
        default:        return "muted";
    }
}

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    const badge = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

    return (
        <div ref={ref} className="relative">
            {/* Bell button with WCAG 44px tap target */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="relative flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#11141a] text-[#8b93a1] hover:text-[#e6e8ec] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none"
                style={{
                    border: "1px solid #1f242d",
                }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {badge && (
                    <span
                        className="absolute top-2 right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white leading-none bg-[#3b82f6]"
                        aria-hidden="true"
                    >
                        {badge}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] bg-[#11141a] z-50 shadow-2xl transition-all duration-150"
                    style={{
                        border: "1px solid #1f242d",
                    }}
                    role="dialog"
                    aria-label="Notifications list"
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid #1f242d" }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#e6e8ec]">
                                Notifications
                            </span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-[#3b82f6]/15 px-2 py-0.5 text-[10px] font-semibold text-[#3b82f6]">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-[11px] font-medium text-[#8b93a1] hover:text-[#e6e8ec] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none rounded"
                                aria-label="Mark all notifications as read"
                            >
                                <CheckCheck className="h-3 w-3" aria-hidden="true" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification Items */}
                    <div className="max-h-[320px] overflow-y-auto divide-y divide-[#1f242d]">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-4">
                                <Bell className="h-5 w-5 text-[#8b93a1]" aria-hidden="true" />
                                <p className="text-[12px] text-[#8b93a1]">No notifications</p>
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => { if (!n.read) markAsRead(n.id); }}
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#141820] transition-colors duration-150"
                                >
                                    <span className="mt-1 shrink-0">
                                        <StatusDot tone={typeTone(n.type)} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-[12px] leading-tight truncate ${n.read ? "text-[#8b93a1]" : "font-semibold text-[#e6e8ec]"}`}>
                                            {n.title}
                                        </p>
                                        <p className="mt-1 text-[11px] line-clamp-2 leading-relaxed text-[#8b93a1]">
                                            {n.message}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                                        <span className="text-[10px] text-[#8b93a1]">
                                            {timeAgo(n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp)}
                                        </span>
                                        {!n.read && (
                                            <span
                                                className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]"
                                                aria-label="Unread"
                                            />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
