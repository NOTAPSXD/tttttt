"use client";

import { useState } from "react";
import Link from "next/link";
import { Server, Globe, Edit3, Cpu, Database, Activity, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import RenameServerModal from "./RenameServerModal";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ServerCardProps {
    servers: any[];
}

export default function ClientServerList({ servers: initialServers }: ServerCardProps) {
    const [servers, setServers] = useState(initialServers);
    const [renameModal, setRenameModal] = useState<{ serverId: string; currentName: string } | null>(null);

    const handleRenameSuccess = (serverId: string, newName: string) => {
        setServers(prevServers =>
            prevServers.map(server =>
                server.id === serverId ? { ...server, name: newName } : server
            )
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {servers.map((server, index) => (
                    <motion.div
                        key={server.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative"
                    >
                        <Link href={`/client/vps/${server.id}`} className="block">
                            <div className="bg-zinc-950/40 backdrop-blur-2xl border border-zinc-800/50 rounded-[2rem] p-8 transition-all duration-500 hover:border-zinc-500/50 hover:bg-zinc-900/40 relative overflow-hidden h-full group">
                                
                                {/* Ambient Glow */}
                                <div className={cn(
                                    "absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full",
                                    server.vfDetails?.state?.running ? "bg-emerald-500" : "bg-red-500"
                                )} />

                                {/* Status Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center border border-zinc-800/50 bg-black/50 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:border-zinc-700",
                                        server.vfDetails?.state?.running ? "text-emerald-500" : "text-zinc-500"
                                    )}>
                                        <Server className="w-7 h-7" />
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500",
                                        server.vfDetails?.state?.running
                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                            : "bg-red-500/10 text-red-400 border-red-500/20"
                                    )}>
                                        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", server.vfDetails?.state?.running ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                        {server.vfDetails?.state?.status || "Offline"}
                                    </div>
                                </div>

                                {/* Identity */}
                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-2 group-hover:text-white transition-colors truncate">
                                        {server.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest font-mono">
                                        <Globe className="w-3.5 h-3.5 text-zinc-700" />
                                        {server.ip || server.vfDetails?.network?.primary?.ipv4?.[0]?.address || "IP Pending"}
                                    </div>
                                </div>

                                {/* Metrics Quick View */}
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800/50">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                            <Cpu className="w-3 h-3" />
                                            Compute
                                        </div>
                                        <p className="text-sm font-black text-white">{server.vfDetails?.cpu || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                            <Database className="w-3 h-3" />
                                            Memory
                                        </div>
                                        <p className="text-sm font-black text-white">{server.vfDetails?.memory || "N/A"}</p>
                                    </div>
                                </div>

                                {/* Hover Action Label */}
                                <div className="mt-8 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                        Access Console
                                    </span>
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-all duration-500">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Quick Actions Overlay */}
                        <div className="absolute top-4 left-4 z-20 flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setRenameModal({ serverId: server.id, currentName: server.name });
                                }}
                                className="w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-2xl"
                                title="Rename Instance"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Rename Modal */}
            {renameModal && (
                <RenameServerModal
                    serverId={renameModal.serverId}
                    currentName={renameModal.currentName}
                    onClose={() => setRenameModal(null)}
                    onSuccess={(newName) => handleRenameSuccess(renameModal.serverId, newName)}
                />
            )}
        </>
    );
}
