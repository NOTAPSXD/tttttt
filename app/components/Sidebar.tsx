"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard, FileText, Settings, LogOut,
    Menu, X, Mail, BarChart3, Users,
    ArrowLeftRight, Server, Terminal
} from "lucide-react";
import { signOut } from "next-auth/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const clientRoutes = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/client" },
    { name: "Servers",   icon: Server,          href: "/client/servers" },
    { name: "Settings",  icon: Settings,        href: "/client/settings" },
];

const adminRoutes = [
    { name: "Overview",  icon: LayoutDashboard, href: "/admin" },
    { name: "Analytics", icon: BarChart3,       href: "/admin/analytics" },
    { name: "Users",     icon: Users,           href: "/admin/users" },
    { name: "Send Mail", icon: Mail,            href: "/admin/mail/send" },
    { name: "Mail Logs", icon: FileText,        href: "/admin/mail/logs" },
    { name: "Console",   icon: Terminal,        href: "/admin/console" },
];

export default function Sidebar({ user }: { user: any }) {
    const pathname    = usePathname();
    const isAdmin     = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    const isAdminPath = pathname.startsWith("/admin");
    const ctx         = isAdminPath ? "ADMIN" : "CLIENT";
    const [open, setOpen] = useState(false);
    const routes      = ctx === "ADMIN" ? adminRoutes : clientRoutes;

    // Close mobile drawer on Escape key
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    // Prevent body scrolling when mobile drawer is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const SidebarContent = () => (
        <div className="flex h-full w-[240px] flex-col bg-[#0a0c10] text-[#e6e8ec] select-none">
            {/* Header: Logo + App Name */}
            <div
                className="flex h-16 shrink-0 items-center gap-3 px-5"
                style={{ borderBottom: "1px solid #1f242d" }}
            >
                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#11141a]"
                    style={{ border: "1px solid #1f242d" }}
                >
                    <img src="/logo.png" alt="VexaNode" className="h-4 w-4 object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold tracking-wider text-[#e6e8ec]">
                        VEXANODE
                    </span>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-[#8b93a1]">
                        {ctx === "ADMIN" ? "Admin Panel" : "Client Portal"}
                    </span>
                </div>
            </div>

            {/* Navigation Body */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Sidebar Navigation">
                {/* Admin/Client Switcher */}
                {isAdmin && (
                    <Link
                        href={ctx === "ADMIN" ? "/client" : "/admin"}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[12px] font-medium text-[#8b93a1] hover:text-[#e6e8ec] bg-[#11141a]/60 hover:bg-[#11141a] transition-colors duration-150 mb-2 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none"
                        style={{ border: "1px solid #1f242d" }}
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-[#8b93a1]" aria-hidden="true" />
                        <span className="truncate">
                            {ctx === "ADMIN" ? "Client view" : "Admin view"}
                        </span>
                    </Link>
                )}

                {/* Section Header */}
                <div className="px-3 pb-1 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b93a1]">
                        Navigation
                    </span>
                </div>

                {/* Nav Links with single-line labels (no tiny subtitles) */}
                {routes.map((route) => {
                    const active =
                        pathname === route.href ||
                        (route.href !== "/client" && route.href !== "/admin" && pathname.startsWith(route.href));

                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[40px]",
                                active
                                    ? "bg-[#11141a] text-[#e6e8ec]"
                                    : "text-[#8b93a1] hover:bg-[#11141a]/60 hover:text-[#e6e8ec]"
                            )}
                            style={{
                                border: active ? "1px solid #1f242d" : "1px solid transparent",
                            }}
                            aria-current={active ? "page" : undefined}
                        >
                            <route.icon
                                className={cn(
                                    "h-4 w-4 shrink-0 transition-colors duration-150",
                                    active ? "text-[#3b82f6]" : "text-[#8b93a1]"
                                )}
                                aria-hidden="true"
                            />
                            <span className="truncate">{route.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer: User profile + Sign out */}
            <div
                className="shrink-0 p-4"
                style={{ borderTop: "1px solid #1f242d" }}
            >
                {/* User Row */}
                <div className="flex items-center gap-3 px-1 mb-3">
                    <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#11141a] text-[12px] font-semibold text-[#e6e8ec]"
                        style={{ border: "1px solid #1f242d" }}
                        aria-hidden="true"
                    >
                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#e6e8ec]">
                            {user?.name || "Client User"}
                        </p>
                        <p className="truncate text-[10px] text-[#8b93a1]">
                            {user?.email || user?.role || "Client"}
                        </p>
                    </div>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-semibold text-[#8b93a1] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[36px]"
                    style={{ border: "1px solid #1f242d" }}
                    aria-label="Sign out of your account"
                >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign out</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Hamburger Button */}
            <button
                onClick={() => setOpen(!open)}
                className="md:hidden fixed top-3 left-4 z-[90] flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#11141a] text-[#8b93a1] hover:text-[#e6e8ec] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none"
                style={{ border: "1px solid #1f242d" }}
                aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={open}
            >
                {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
            </button>

            {/* Mobile Drawer Backdrop */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="md:hidden fixed inset-0 z-[80] bg-black/60 transition-opacity duration-150"
                    aria-hidden="true"
                />
            )}

            {/* Desktop Fixed Sidebar */}
            <aside
                className="hidden md:flex h-full w-[240px] shrink-0 flex-col overflow-hidden"
                style={{ borderRight: "1px solid #1f242d" }}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Drawer Sidebar */}
            <div
                className={cn(
                    "md:hidden fixed inset-y-0 left-0 z-[85] h-full w-[240px] transform transition-transform duration-150 ease-in-out motion-reduce:transition-none",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
                style={{ borderRight: "1px solid #1f242d" }}
                role="dialog"
                aria-modal="true"
                aria-label="Mobile Navigation Drawer"
            >
                <SidebarContent />
            </div>
        </>
    );
}
