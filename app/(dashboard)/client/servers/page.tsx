import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchClientDashboardData } from "@/lib/client-data";
import ServerListContent from "@/app/components/client/ServerListContent";

export default async function ClientServersPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");
    if (session.user.role === "ADMIN") redirect("/admin");

    const data = await fetchClientDashboardData(session.user.id);

    if (!data) {
        return (
            <div className="py-24 text-center">
                <h1 className="text-2xl font-bold text-panel-text">Could not load servers</h1>
                <p className="mt-2 text-sm text-panel-muted">Something went wrong. Try again shortly.</p>
            </div>
        );
    }

    return <ServerListContent initial={data} />;
}