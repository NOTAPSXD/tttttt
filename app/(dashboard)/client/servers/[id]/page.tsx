import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { fetchClientServer } from "@/lib/client-data";
import ServerDetailContent from "@/app/components/client/ServerDetailContent";

export default async function ClientServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");
    if (isAdmin(String(session.user.role))) redirect("/admin");

    if (!isValidObjectId(id)) notFound();

    const data = await fetchClientServer(id, session.user.id);
    if (!data) notFound();

    return <ServerDetailContent serverId={id} initial={data.initial} providerType={data.providerType} />;
}