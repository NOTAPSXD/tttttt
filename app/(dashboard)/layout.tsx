import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";
import BottomNav from "@/app/components/mobile/BottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-black text-foreground overflow-hidden">
            <Sidebar user={session.user} />
            <main className="flex-1 overflow-y-auto relative w-full bg-black pb-16 md:pb-0">
                {/* Notification Center - Fixed Position */}
                <div className="fixed top-4 right-4 md:top-6 md:right-6 z-30">
                    <NotificationCenter />
                </div>

                {/* Subtle gradient overlay for depth */}
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-zinc-900/5 via-transparent to-transparent pointer-events-none z-0" />

                <div className="relative z-10 w-full h-full p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
