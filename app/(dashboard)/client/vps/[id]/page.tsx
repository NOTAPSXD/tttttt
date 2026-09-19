import { redirect } from "next/navigation";

export default async function LegacyVPSRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/client/servers/${id}`);
}