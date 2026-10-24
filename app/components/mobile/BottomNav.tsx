"use client";

import { Home, Server, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { motion } from "framer-motion";

const navItems = [
    { icon: Home,     label: "Home",          href: "/client" },
    { icon: Server,   label: "Servers",        href: "/client/servers" },
    { icon: Bell,     label: "Notifications",  href: "/client/notifications", badge: true },
    { icon: Settings, label: "Settings",       href: "/client/settings" },
] as const;

export default function BottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    const isActive = (href: string) =>
        pathname === href || (href !== "/client" && pathname.startsWith(href + "/"));

    return (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 safe-bottom">
            {/* Frosted bar */}
            <div className="mx-3 mb-2 rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0d1018]/90 backdrop-blur-xl">
                <div className="flex items-center justify-around h-14 px-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const badge  = "badge" in item ? unreadCount : 0;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative select-none"
                            >
                                {/* Active pill background */}
                                {active && (
                                    <motion.div
                                        layoutId="bottom-pill"
                                        className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-white/[0.07]"
                                        transition={{ type: "spring", damping: 24, stiffness: 260 }}
                                    />
                                )}

                                <div className="relative z-10">
                                    <item.icon
                                        className="w-[18px] h-[18px] transition-colors duration-150"
                                        style={{ color: active ? "#3b82f6" : "#8b93a1" }}
                                    />
                                    {!!badge && badge > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#ef4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {badge > 9 ? "9+" : badge}
                                        </span>
                                    )}
                                </div>

                                <span
                                    className="text-[10px] font-medium tracking-wide z-10 transition-colors duration-150"
                                    style={{ color: active ? "#e6e8ec" : "#8b93a1" }}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
