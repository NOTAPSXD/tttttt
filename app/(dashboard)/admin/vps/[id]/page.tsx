import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { isValidObjectId } from "mongoose";
import { vf } from "@/lib/virtfusion";
import { redirect, notFound } from "next/navigation";
import ServerControl from "@/app/components/ServerControl";
import { Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminVPSDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");
    if (session.user.role !== 'ADMIN') redirect("/client");

    let server: any = null;
    try {
        await connectDB();
        
        let serverDoc = null;
        
        // Try searching by MongoDB ID if it's a valid ObjectId
        if (isValidObjectId(id)) {
            serverDoc = await Server.findById(id).populate('userId').lean();
        }
        
        // If not found by ID (or not a valid ObjectId), try searching by VirtFusion ID
        if (!serverDoc) {
            serverDoc = await Server.findOne({ virtfusionId: id }).populate('userId').lean();
        }

        if (serverDoc) {
            server = { 
                ...serverDoc, 
                id: serverDoc._id.toString(),
                userEmail: (serverDoc.userId as any)?.email
            };
        } else {
            // Unassigned server (not in DB yet)
            // We can still manage it using the VF ID directly
            server = {
                virtfusionId: id,
                id: id, // Fallback ID
                name: "Unassigned Asset",
                userEmail: "System / Unassigned"
            };
        }
    } catch (e) {
        console.error(e);
        return <div className="p-10 text-red-500 font-bold bg-red-500/10 rounded-3xl border border-red-500/20">Database Synchronization Error</div>;
    }

    if (!server) notFound();

    // Initial Fetch from VirtFusion
    const vfDetails = await vf.getServer(server.virtfusionId);

    if (!vfDetails) {
        return (
            <div className="p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                    <Shield className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Infrastructure Error</h1>
                <p className="text-zinc-500 max-w-md mx-auto font-medium">Could not establish a secure connection to the virtualization API for server asset <b>{server.virtfusionId}</b>.</p>
                <Link href="/admin" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                    <ChevronLeft className="w-4 h-4" /> Return to Command Center
                </Link>
            </div>
        )
    }

    // Merge metadata
    const initialData = { ...vfDetails, name: server.name };

    return (
        <div className="space-y-10">
            {/* Admin Header Overlay */}
            <div className="flex items-center justify-between p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest">Administrative Control Active</h2>
                        <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest mt-1">Managing asset for: {server.userEmail || "Unassigned"}</p>
                    </div>
                </div>
                <Link href="/admin" className="px-6 py-2 bg-black border border-amber-500/30 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all">
                    Exit Admin View
                </Link>
            </div>

            <ServerControl initialVfData={initialData} serverId={server.id} />
        </div>
    );
}
