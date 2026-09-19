"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import BottomNav from "@/app/components/mobile/BottomNav";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";

export default function DashboardShell({ user, children }: { user: any; children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdminPage = pathname.startsWith("/admin");

    return (
        <div className="flex h-screen bg-[#0b0f17] text-foreground overflow-hidden">
            <Sidebar user={user} />

            <main className="relative w-full flex-1 overflow-y-auto bg-[#0b0f17] pb-16 md:pb-0">
                {/* Notification Center - fixed top right */}
                <div className="fixed right-4 top-4 z-30 md:right-6 md:top-6">
                    <NotificationCenter />
                </div>

                {/* Mobile brand wordmark (hamburger is left, bell is right) */}
                <div className="pointer-events-none fixed left-1/2 top-5 z-40 -translate-x-1/2 md:hidden">
                    <span
                        className={`flex items-center gap-2 rounded-full border border-stroke bg-surface/80 px-3 py-1 backdrop-blur-md ${
                            isAdminPage ? "text-[#4f7cff]" : "text-panel-text"
                        }`}
                    >
                        <img src="/logo.png" alt="VEXANODE" className="h-4 w-4 object-contain" />
                        <span className="text-[10px] font-black tracking-[0.2em]">VEXANODE</span>
                    </span>
                </div>

                {/* Subtle top gradient */}
                <div className="pointer-events-none absolute left-0 top-0 z-0 h-[600px] w-full bg-gradient-to-b from-primary-blue/[0.05] via-transparent to-transparent" />

                <div className="relative z-10 mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</div>
            </main>

            <BottomNav />
        </div>
    );
}