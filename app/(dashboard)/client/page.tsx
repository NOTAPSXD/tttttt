import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchClientDashboardData } from "@/lib/client-data";
import DashboardContent from "@/app/components/client/DashboardContent";

export default async function ClientDashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");
    if (session.user.role === "ADMIN") redirect("/admin");

    const data = await fetchClientDashboardData(session.user.id);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <h1 className="text-2xl font-bold text-panel-text">Dashboard unavailable</h1>
                <p className="text-sm text-panel-muted">Something went wrong while loading your dashboard. Try again shortly.</p>
            </div>
        );
    }

    return <DashboardContent initial={data} />;
}