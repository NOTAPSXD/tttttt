"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    serverId?: string;
    serverName?: string;
    timestamp: Date;
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    showNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    requestBrowserPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_NOTIFICATIONS = 100;

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

    // Load notifications from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('vps_notifications');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                })));
            } catch (e) {
                console.error('Failed to load notifications:', e);
            }
        }

        // Check browser notification permission
        if ('Notification' in window) {
            setBrowserPermission(Notification.permission);
        }
    }, []);

    // Save notifications to localStorage whenever they change
    useEffect(() => {
        if (notifications.length > 0) {
            localStorage.setItem('vps_notifications', JSON.stringify(notifications));
        }
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const requestBrowserPermission = async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            console.warn('Browser notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            setBrowserPermission('granted');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            setBrowserPermission(permission);
            return permission === 'granted';
        }

        return false;
    };

    const sendBrowserNotification = (notification: Notification) => {
        if (browserPermission !== 'granted' || document.hasFocus()) {
            return; // Don't send if no permission or tab is active
        }

        try {
            const browserNotif = new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id,
                requireInteraction: notification.type === 'error',
            });

            browserNotif.onclick = () => {
                window.focus();
                if (notification.serverId) {
                    window.location.href = `/client/vps/${notification.serverId}`;
                }
                browserNotif.close();
            };
        } catch (e) {
            console.error('Failed to send browser notification:', e);
        }
    };

    const showNotification = (data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const notification: Notification = {
            ...data,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
        };

        // Add to history
        setNotifications(prev => {
            const updated = [notification, ...prev];
            // Keep only last MAX_NOTIFICATIONS
            return updated.slice(0, MAX_NOTIFICATIONS);
        });

        // Show toast notification
        const toastMessage = notification.serverName
            ? `${notification.serverName}: ${notification.message}`
            : notification.message;

        switch (notification.type) {
            case 'success':
                toast.success(notification.title, {
                    description: toastMessage,
                    duration: 4000,
                });
                break;
            case 'error':
                toast.error(notification.title, {
                    description: toastMessage,
                    duration: 6000,
                });
                break;
            case 'warning':
                toast.warning(notification.title, {
                    description: toastMessage,
                    duration: 5000,
                });
                break;
            case 'info':
            default:
                toast.info(notification.title, {
                    description: toastMessage,
                    duration: 4000,
                });
                break;
        }

        // Send browser notification if permitted
        sendBrowserNotification(notification);
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem('vps_notifications');
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                showNotification,
                markAsRead,
                markAllAsRead,
                clearAll,
                requestBrowserPermission,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}
