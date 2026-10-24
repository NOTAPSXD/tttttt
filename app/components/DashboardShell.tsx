"use client";

import Sidebar from "@/app/components/Sidebar";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";

export default function DashboardShell({
    user,
    children,
}: {
    user: any;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen min-h-dvh overflow-hidden bg-[#0a0c10] text-[#e6e8ec]">
            {/* Sidebar (Desktop 240px + Mobile Drawer) */}
            <Sidebar user={user} />

            {/* Main Content Area */}
            <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
                {/* Header Top Bar with Notification Bell */}
                <header
                    className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#0a0c10]/95 backdrop-blur-sm"
                    style={{ borderBottom: "1px solid #1f242d" }}
                >
                    <div className="flex items-center gap-3">
                        {/* Space placeholder on mobile so hamburger doesn't collide */}
                        <div className="w-11 md:hidden" aria-hidden="true" />
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider text-[#8b93a1]">
                                VexaNode Cloud Infrastructure
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <NotificationCenter />
                    </div>
                </header>

                {/* Main Page Content - widescreen responsive container */}
                <main className="w-full flex-1">
                    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
