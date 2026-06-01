"use client";

import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

interface Notification {
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        // Fetch notifications from API
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch("/api/notifications");
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "POST" });
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}`, { method: "DELETE" });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "success":
                return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case "error":
                return <XCircle className="w-5 h-5 text-red-400" />;
            case "warning":
                return <AlertCircle className="w-5 h-5 text-amber-400" />;
            default:
                return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    return (
        <>
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 md:p-2.5 rounded-lg md:rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
            >
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed top-16 md:top-20 right-4 md:right-8 w-[calc(100vw-2rem)] md:w-96 max-h-[70vh] bg-[#09090b] border border-zinc-800 rounded-xl md:rounded-2xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 md:p-5 border-b border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Notifications</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    {unreadCount} unread
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[calc(70vh-5rem)]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-sm">No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-zinc-900/50 transition-colors ${!notification.read ? "bg-zinc-900/30" : ""
                                                }`}
                                            onClick={() => !notification.read && markAsRead(notification.id)}
                                        >
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-0.5">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="text-sm font-semibold text-white">
                                                            {notification.title}
                                                        </h4>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(notification.id);
                                                            }}
                                                            className="p-1 hover:bg-zinc-800 rounded transition-colors"
                                                        >
                                                            <X className="w-3 h-3 text-zinc-500" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 mb-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-600">
                                                        {new Date(notification.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
