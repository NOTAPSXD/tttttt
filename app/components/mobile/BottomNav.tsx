"use client";

import { Home, Server, Bell, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/app/contexts/NotificationContext';

export default function BottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    const navItems = [
        { icon: Home, label: 'Dashboard', href: '/client' },
        { icon: Server, label: 'Servers', href: '/client' },
        { icon: Bell, label: 'Notifications', href: '/client/notifications', badge: unreadCount },
        { icon: Settings, label: 'Settings', href: '/client/settings' },
    ];

    const isActive = (href: string) => {
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#09090b] border-t border-zinc-800 z-50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] relative ${active
                                    ? 'text-white bg-zinc-800'
                                    : 'text-zinc-500 hover:text-zinc-300 active:scale-95'
                                }`}
                        >
                            <div className="relative">
                                <Icon className="w-5 h-5" />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
