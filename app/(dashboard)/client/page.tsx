import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchClientDashboardData } from "@/lib/client-data";
import DashboardContent from "@/app/components/client/DashboardContent";
import { AlertCircle, RefreshCw } from "lucide-react";

export default async function ClientDashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    const data = await fetchClientDashboardData(session.user.id);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#11141a] text-[#ef4444]"
                    style={{ border: "1px solid #1f242d" }}
                >
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="space-y-1 max-w-md">
                    <h1 className="text-xl font-semibold text-[#e6e8ec] tracking-tight">
                        Dashboard unavailable
                    </h1>
                    <p className="text-[13px] text-[#8b93a1]">
                        We were unable to communicate with the cloud management backend. Please verify your connection or try again.
                    </p>
                </div>
                <a
                    href="/client"
                    className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13px] font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[44px]"
                >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry now
                </a>
            </div>
        );
    }

    return <DashboardContent initial={data} />;
}
