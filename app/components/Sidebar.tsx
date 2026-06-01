"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard, Server, FileText, Settings, LogOut,
    Menu, X, Mail, BarChart3, ShieldCheck, Users,
    ArrowLeftRight, ChevronRight, Zap
} from "lucide-react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const clientRoutes = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/client", desc: "Overview" },
    { name: "My Invoices", icon: FileText, href: "/invoices", desc: "Billing" },
    { name: "Account Settings", icon: Settings, href: "/client/settings", desc: "Preferences" },
];

const adminRoutes = [
    { name: "Admin Home", icon: LayoutDashboard, href: "/admin", desc: "Overview" },
    { name: "Analytics", icon: BarChart3, href: "/admin/analytics", desc: "Metrics" },
    { name: "Cloud Instances", icon: Server, href: "/admin/ec2", desc: "Compute" },
    { name: "User Directory", icon: Users, href: "/admin/users", desc: "Manage" },
    { name: "Communication", icon: Mail, href: "/admin/mail/send", desc: "Outreach" },
    { name: "Email History", icon: FileText, href: "/admin/mail/logs", desc: "Logs" },
    { name: "Global Billing", icon: FileText, href: "/invoices", desc: "Finance" },
];

export default function Sidebar({ user }: { user: any }) {
    const pathname = usePathname();
    const isAdmin = user.role === "ADMIN";
    const isAdminPath = pathname.startsWith("/admin");
    const ctx = isAdminPath ? "ADMIN" : "CLIENT";
    const [mobileOpen, setMobileOpen] = useState(false);

    const routes = ctx === "ADMIN" ? adminRoutes : clientRoutes;

    const SidebarContent = () => (
        <div className="relative flex flex-col h-full overflow-hidden" style={{ background: "#09090b" }}>

            {/* Ambient glow blob */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    background: ctx === "ADMIN"
                        ? "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(79,124,255,0.12) 0%, transparent 70%)"
                        : "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(255,255,255,0.04) 0%, transparent 70%)",
                }}
            />

            {/* Noise overlay */}
            <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.025] z-0" xmlns="http://www.w3.org/2000/svg">
                <filter id="noise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noise)" />
            </svg>

            {/* Top scan line */}
            <div className="absolute top-0 left-0 right-0 h-px z-10" style={{
                background: ctx === "ADMIN"
                    ? "linear-gradient(90deg, transparent, rgba(79,124,255,0.6), transparent)"
                    : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)"
            }} />

            {/* ── Header ── */}
            <div className="relative z-10 flex items-center gap-4 px-6 h-[72px] shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <motion.div
                    key={ctx}
                    initial={{ scale: 0.7, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                        background: ctx === "ADMIN" ? "rgba(79,124,255,0.15)" : "rgba(255,255,255,0.06)",
                        border: ctx === "ADMIN" ? "1px solid rgba(79,124,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                    {/* Pulse ring for admin */}
                    {ctx === "ADMIN" && (
                        <motion.div
                            className="absolute inset-0 rounded-xl"
                            style={{ border: "1px solid rgba(79,124,255,0.4)" }}
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                </motion.div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black tracking-[0.12em] text-white">VEXANODE</span>
                        <motion.div
                            key={ctx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{
                                background: ctx === "ADMIN" ? "rgba(79,124,255,0.15)" : "rgba(255,255,255,0.06)",
                                border: ctx === "ADMIN" ? "1px solid rgba(79,124,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <Zap className={cn("w-2.5 h-2.5", ctx === "ADMIN" ? "text-[#4f7cff]" : "text-zinc-400")} />
                            <span className={cn("text-[9px] font-black tracking-[0.18em]", ctx === "ADMIN" ? "text-[#4f7cff]" : "text-zinc-500")}>
                                {ctx}
                            </span>
                        </motion.div>
                    </div>
                    <p className="text-[10px] text-zinc-600 tracking-wide mt-0.5 font-medium">Cloud Panel v2</p>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="relative z-10 flex-1 flex flex-col px-3 py-5 gap-1 overflow-y-auto min-h-0">

                {/* Admin context switcher */}
                {isAdmin && (
                    <Link
                        href={ctx === "ADMIN" ? "/client" : "/admin"}
                        onClick={() => setMobileOpen(false)}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 transition-all duration-200"
                        style={{
                            background: ctx === "ADMIN" ? "rgba(255,255,255,0.03)" : "rgba(79,124,255,0.06)",
                            border: ctx === "ADMIN" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(79,124,255,0.2)",
                        }}
                    >
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                            style={{
                                background: ctx === "ADMIN" ? "rgba(255,255,255,0.06)" : "rgba(79,124,255,0.2)",
                                border: ctx === "ADMIN" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(79,124,255,0.3)",
                            }}
                        >
                            <ArrowLeftRight className={cn("w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500", ctx === "ADMIN" ? "text-zinc-400" : "text-[#4f7cff]")} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-black">Switch to</p>
                            <p className="text-[11px] font-black text-white tracking-wide">
                                {ctx === "ADMIN" ? "Client View" : "Admin Panel"}
                            </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors group-hover:translate-x-0.5 transition-transform duration-150" />
                    </Link>
                )}

                {/* Section label */}
                <p className="px-3 text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-2">Navigation</p>

                {/* Nav items */}
                <div className="flex flex-col gap-0.5">
                    {routes.map((route, i) => {
                        const isActive = pathname === route.href ||
                            (route.href !== "/client" && route.href !== "/admin" && pathname.startsWith(route.href));

                        return (
                            <motion.div
                                key={route.href}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.25 }}
                            >
                                <Link
                                    href={route.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 overflow-hidden",
                                        isActive
                                            ? "text-white"
                                            : "text-zinc-500 hover:text-zinc-200"
                                    )}
                                    style={isActive ? {
                                        background: ctx === "ADMIN"
                                            ? "rgba(79,124,255,0.12)"
                                            : "rgba(255,255,255,0.07)",
                                        border: ctx === "ADMIN"
                                            ? "1px solid rgba(79,124,255,0.25)"
                                            : "1px solid rgba(255,255,255,0.1)",
                                    } : {
                                        border: "1px solid transparent",
                                    }}
                                >
                                    {/* Hover bg */}
                                    {!isActive && (
                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                            style={{ background: "rgba(255,255,255,0.03)" }} />
                                    )}

                                    {/* Active left bar */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-bar"
                                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                            style={{
                                                background: ctx === "ADMIN"
                                                    ? "linear-gradient(180deg, #4f7cff, #7c9fff)"
                                                    : "rgba(255,255,255,0.6)",
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}

                                    {/* Icon */}
                                    <div className={cn(
                                        "relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                                        isActive
                                            ? ctx === "ADMIN"
                                                ? "bg-[#4f7cff]/20 text-[#4f7cff]"
                                                : "bg-white/10 text-white"
                                            : "bg-transparent text-zinc-600 group-hover:text-zinc-300"
                                    )}>
                                        <route.icon className="w-[15px] h-[15px]" />
                                    </div>

                                    {/* Label + desc */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-[12px] font-bold tracking-wide leading-none",
                                            isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                                        )}>
                                            {route.name}
                                        </p>
                                        <p className="text-[10px] text-zinc-700 mt-0.5 group-hover:text-zinc-600 transition-colors">
                                            {route.desc}
                                        </p>
                                    </div>

                                    {/* Active dot */}
                                    {isActive && (
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            ctx === "ADMIN" ? "bg-[#4f7cff]" : "bg-white/50"
                                        )} />
                                    )}
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="relative z-10 p-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {/* User row */}
                <div className="flex items-center gap-3 px-1 mb-3">
                    <div className="relative shrink-0">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white"
                            style={{
                                background: ctx === "ADMIN" ? "rgba(79,124,255,0.2)" : "rgba(255,255,255,0.08)",
                                border: ctx === "ADMIN" ? "1px solid rgba(79,124,255,0.35)" : "1px solid rgba(255,255,255,0.1)",
                                fontFamily: "'DM Mono', monospace",
                            }}
                        >
                            {user.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        {/* Online indicator */}
                        <div
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                            style={{
                                background: ctx === "ADMIN" ? "#4f7cff" : "#22c55e",
                                borderColor: "#09090b",
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-white uppercase tracking-wider truncate">
                            {user.name}
                        </p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-bold mt-0.5">
                            {user.role}
                        </p>
                    </div>
                </div>

                {/* Sign out */}
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="group w-full flex items-center justify-center gap-2 h-9 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-zinc-600 hover:text-red-400 transition-all duration-200"
                    style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.2)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                    }}
                >
                    <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-5 left-5 z-[100] w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-200"
                style={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)" }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mobileOpen ? "x" : "menu"}
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
                    </motion.div>
                </AnimatePresence>
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden fixed inset-0 z-[90]"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                    />
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-[260px] h-full flex-col shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <SidebarContent />
            </aside>

            {/* Mobile sidebar */}
            <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: mobileOpen ? 0 : "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 250 }}
                className="md:hidden fixed top-0 left-0 h-full w-[260px] z-[100]"
                style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
                <SidebarContent />
            </motion.aside>
        </>
    );
}