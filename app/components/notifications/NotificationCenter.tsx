"use client";

import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/app/contexts/NotificationContext';
import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'border-green-500/20 bg-green-500/5';
            case 'error':
                return 'border-red-500/20 bg-red-500/5';
            case 'warning':
                return 'border-yellow-500/20 bg-yellow-500/5';
            case 'info':
            default:
                return 'border-blue-500/20 bg-blue-500/5';
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-zinc-800/50 transition-all"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-zinc-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl z-50 flex flex-col animate-scale-in">
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-white">Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${filter === 'all'
                                        ? 'bg-white text-black font-bold'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                All ({notifications.length})
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${filter === 'unread'
                                        ? 'bg-white text-black font-bold'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                Unread ({unreadCount})
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 text-sm">
                                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => {
                                            if (!notification.read) {
                                                markAsRead(notification.id);
                                            }
                                        }}
                                        className={`p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors ${!notification.read ? 'bg-zinc-900/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-2xl flex-shrink-0">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-white text-sm">
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                <p className="text-zinc-400 text-sm mb-2">
                                                    {notification.message}
                                                </p>
                                                {notification.serverName && (
                                                    <p className="text-zinc-500 text-xs mb-1">
                                                        Server: {notification.serverName}
                                                    </p>
                                                )}
                                                <p className="text-zinc-600 text-xs">
                                                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-zinc-800 flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (confirm('Clear all notifications?')) {
                                        clearAll();
                                    }
                                }}
                                className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
