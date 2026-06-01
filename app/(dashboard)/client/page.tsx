"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Server as ServerIcon, Activity, Cpu, AlertCircle, Zap, TrendingUp, ShieldCheck } from "lucide-react";
import ClientServerList from "@/app/components/ClientServerList";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function ClientDashboard() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/client/stats");
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch client stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                    <motion.div
                        className="absolute inset-0 border-4 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            </div>
        );
    }

    if (!stats || stats.servers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-950/50 backdrop-blur-2xl border border-zinc-800/50 p-12 rounded-[2.5rem] max-w-md shadow-2xl"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <AlertCircle className="w-12 h-12 text-zinc-500" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">No Infrastructure</h3>
                    <p className="text-zinc-400 mb-8 font-medium leading-relaxed">Your cloud infrastructure is currently empty. Connect with an administrator to provision your first high-performance VPS node.</p>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-8" />
                    <p className="text-xs text-zinc-500 font-black uppercase tracking-[0.2em]">Platform Status: Operational</p>
                </motion.div>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-12 max-w-[1600px] mx-auto pb-20"
        >
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
                <motion.div variants={item}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Live Infrastructure Overview</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                        My <span className="text-zinc-500">Servers</span>
                    </h2>
                    <p className="text-zinc-500 mt-4 text-base md:text-lg font-medium max-w-xl">
                        Monitor, manage, and scale your high-performance virtual private servers in real-time.
                    </p>
                </motion.div>

                <motion.div
                    variants={item}
                    className="flex items-center gap-4 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/50 p-2 rounded-2xl"
                >
                    <div className="px-6 py-3 rounded-xl bg-white text-black font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-2xl">
                        <ServerIcon className="w-4 h-4" />
                        {stats.servers.length} Active Nodes
                    </div>
                </motion.div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<ServerIcon className="w-6 h-6" />}
                    label="Active Nodes"
                    value={stats.servers.length}
                    trend="Running"
                    color="white"
                    index={0}
                />
                <StatCard
                    icon={<Activity className="w-6 h-6" />}
                    label="Real-time Status"
                    value={stats.runningServers}
                    trend={`${((stats.runningServers / stats.servers.length) * 100).toFixed(0)}% Online`}
                    color="emerald"
                    index={1}
                />
                <StatCard
                    icon={<Cpu className="w-6 h-6" />}
                    label="Compute Power"
                    value={stats.totalCpu}
                    suffix="vCores"
                    trend="High Density"
                    color="blue"
                    index={2}
                />
                <StatCard
                    icon={<Zap className="w-6 h-6" />}
                    label="Memory Capacity"
                    value={(stats.totalRam / 1024).toFixed(1)}
                    suffix="GB"
                    trend="ECC Buffered"
                    color="amber"
                    index={3}
                />
            </div>

            {/* Server Grid Section */}
            <motion.div variants={item} className="pt-8">
                <div className="flex items-center gap-4 mb-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Instances</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/50 to-transparent" />
                </div>
                <ClientServerList servers={stats.servers} />
            </motion.div>
        </motion.div>
    );
}

function StatCard({ icon, label, value, suffix, color, trend, index }: any) {
    const variants: any = {
        white: "from-white/10 to-transparent text-white",
        emerald: "from-emerald-500/10 to-transparent text-emerald-500",
        blue: "from-blue-500/10 to-transparent text-blue-500",
        amber: "from-amber-500/10 to-transparent text-amber-500",
    };

    const iconColors: any = {
        white: "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]",
        emerald: "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]",
        blue: "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]",
        amber: "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { delay: index * 0.1 } }
            }}
            className="group relative overflow-hidden bg-zinc-950/40 backdrop-blur-2xl border border-zinc-800/50 p-8 rounded-[2rem] transition-all duration-500 hover:border-zinc-700 hover:bg-zinc-900/40"
        >
            <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", variants[color])} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
            
            <div className="relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110", iconColors[color])}>
                    {icon}
                </div>
                
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black mb-2">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white tracking-tighter">
                        {value}
                    </h3>
                    {suffix && <span className="text-lg text-zinc-600 font-bold tracking-tighter">{suffix}</span>}
                </div>
                
                <div className="mt-8 flex items-center gap-2">
                    <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-800/50 bg-black/50", 
                        color === 'emerald' ? 'text-emerald-500' : 'text-zinc-400'
                    )}>
                        {trend}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
