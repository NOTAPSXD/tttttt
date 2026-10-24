"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
    Play, Square, RotateCcw, Terminal, Power, RefreshCw, Key, Disc, ChevronLeft, Server, X,
    Check, Settings, Shield, Wifi, HardDrive, AlertCircle, Info, Plus, ShieldCheck,
    Download, Upload, Cpu, MemoryStick, Zap, Globe, Edit3, Activity, ArrowRight, Save, History, Lock, ShieldAlert
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { useRouter } from "next/navigation";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { useServerStream } from "@/app/hooks/useServerStream";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
} as const;

// --- Types ---
interface VFData {
    name: string;
    hostname: string;
    memory: string;
    state?: {
        status: string;
        running: boolean;
        cpu: string;
        memory?: string;
        network: {
            primary: {
                traffic: {
                    rx: number;
                    tx: number;
                    total: number;
                }
            }
        }
    };
    storage?: { capacity: string, primary: boolean }[];
    network?: {
        primary: {
            ipv4: { address: string, gateway?: string, netmask?: string }[];
            limit?: string;
        }
    };
}

export default function ServerControl({ initialVfData, serverId }: { initialVfData: any, serverId: string }) {
    const { data: vfData, error: streamError, status: streamStatus } = useServerStream(serverId, initialVfData);
    const [loadingAction, setLoadingAction] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [cpuHistory, setCpuHistory] = useState<any[]>([]);
    const [memHistory, setMemHistory] = useState<any[]>([]);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [newHostname, setNewHostname] = useState(initialVfData.hostname);
    const [newServerName, setNewServerName] = useState(initialVfData.name);
    const router = useRouter();
    const { showNotification } = useNotifications();

    // --- History Tracking ---
    useEffect(() => {
        if (!vfData) return;

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cpuVal = vfData.state?.cpu ? parseFloat(vfData.state.cpu.replace(" %", "")) : 0;

        let memVal = 0;
        if (vfData.state?.memory) {
            const memStr = vfData.state.memory;
            if (memStr.includes("%")) {
                memVal = parseFloat(memStr.replace(" %", ""));
            } else if (memStr.includes("MB")) {
                const used = parseFloat(memStr.replace(" MB", ""));
                const total = parseInt(vfData.memory || "1024");
                memVal = (used / total) * 100;
            }
        }

        setCpuHistory(prev => [...prev.slice(-19), { time: timestamp, value: cpuVal }]);
        setMemHistory(prev => [...prev.slice(-19), { time: timestamp, value: memVal }]);
    }, [vfData]);

    // --- Handlers ---
    const handlePower = async (action: string) => {
        setLoadingAction(action);
        try {
            await axios.post(`/api/vps/${serverId}/power`, { action });
            showNotification({
                type: 'success',
                title: 'Infrastructure Command',
                message: `${action.toUpperCase()} command successfully executed on node.`,
                serverId,
                serverName: vfData.name,
            });
        } catch (e: any) {
            const errorMsg = e.response?.data?.error || "Power Command Refused";
            showNotification({ type: 'error', title: 'Command Failure', message: errorMsg, serverId, serverName: vfData.name });
        } finally {
            setLoadingAction("");
        }
    };

    const handleResetPass = async () => {
        setLoadingAction("reset");
        try {
            const res = await axios.post(`/api/vps/${serverId}/reset-password`);
            setNewPassword(res.data.expectedPassword);
            showNotification({ type: 'success', title: 'Security Event', message: 'Root credentials successfully regenerated.' });
        } catch (e: any) {
            showNotification({ type: 'error', title: 'Reset Blocked', message: 'Credential regeneration failed security checks.' });
        } finally {
            setLoadingAction("");
        }
    }

    const handleUpdateSettings = async () => {
        setLoadingAction("settings");
        try {
            await axios.patch(`/api/vps/${serverId}/settings`, {
                name: newServerName.trim(),
                hostname: newHostname.trim()
            });
            showNotification({ type: 'success', title: 'Profile Updated', message: 'Server configuration updated successfully.' });
        } catch (e: any) {
            showNotification({ type: 'error', title: 'Update Failed', message: 'Could not synchronize configuration changes.' });
        } finally {
            setLoadingAction("");
        }
    }

    // --- Calculations ---
    const inbound = (vfData.state?.network?.primary?.traffic?.rx || 0) / (1024 * 1024 * 1024);
    const outbound = (vfData.state?.network?.primary?.traffic?.tx || 0) / (1024 * 1024 * 1024);
    const totalNet = (vfData.state?.network?.primary?.traffic?.total || 0) / (1024 * 1024 * 1024);

    let allowance = 4000;
    if (vfData.network?.primary?.limit) {
        const limitStr = vfData.network.primary.limit;
        if (limitStr.includes("GB")) allowance = parseFloat(limitStr.replace(" GB", ""));
    }
    const netPercent = allowance > 0 ? Math.min((totalNet / allowance) * 100, 100) : 0;

    const currentCpu = vfData.state?.cpu ? parseFloat(vfData.state.cpu.replace(" %", "")) : 0;
    const currentMem = memHistory.length > 0 ? memHistory[memHistory.length - 1].value : 0;
    const ip = initialVfData.network?.primary?.ipv4?.[0]?.address || "Provisioning...";

    // --- Styles ---
    // --- Styles ---
    const cardClass = "bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl overflow-hidden transition-all duration-300 hover:border-zinc-700/80 group shadow-xl shadow-black/10";
    const subTextClass = "text-[10px] font-bold text-zinc-500 uppercase tracking-wider";

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-blue-600 selection:text-white">
            {/* Subtle Gradient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full opacity-40" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800/10 blur-[100px] rounded-full opacity-30" />
            </div>

            {/* Main Wrapper */}
            <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10 space-y-8">

                {/* Simplified Header */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-white tracking-tight">{vfData.name}</h1>
                                <StatusBadge status={vfData.state?.status} running={vfData.state?.running} />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-mono text-zinc-500">{ip}</span>
                                <span className="text-zinc-700">•</span>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{vfData.hostname}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 transition-all",
                            streamStatus === 'connected'
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                        )}>
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                streamStatus === 'connected' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            )} />
                            {streamStatus === 'connected' ? "Live Telemetry" : "Connecting..."}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all"
                        >
                            <RefreshCw className={cn("w-4 h-4", loadingAction ? "animate-spin" : "")} />
                        </button>
                    </div>
                </header>

                {/* Refined Tabs */}
                <div className="flex items-center gap-1 bg-zinc-900/40 p-1 rounded-xl border border-zinc-800/50 w-fit relative">
                    {['Overview', 'Network', 'Storage', 'Security', 'Settings'].map(tab => {
                        const isActive = activeTab === tab.toLowerCase();
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={cn(
                                    "px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all relative z-10",
                                    isActive
                                        ? "text-white"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabGlow"
                                        className="absolute inset-0 bg-zinc-800/80 rounded-lg -z-10"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                {tab}
                            </button>
                        )
                    })}
                </div>
                <main className="relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="space-y-8"
                            >
                                {/* Top Stats Bar */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <MetricCard label="CPU Usage" value={currentCpu.toFixed(1)} unit="%" icon={<Cpu className="w-4 h-4 text-blue-400" />} trend={cpuHistory} color="#3b82f6" />
                                    <MetricCard label="Memory Usage" value={currentMem.toFixed(1)} unit="%" icon={<MemoryStick className="w-4 h-4 text-purple-400" />} trend={memHistory} color="#a855f7" />
                                    <SimpleMetricCard label="Inbound" value={inbound.toFixed(2)} unit="GB" icon={<Download className="w-4 h-4 text-emerald-400" />} color="emerald" />
                                    <SimpleMetricCard label="Outbound" value={outbound.toFixed(2)} unit="GB" icon={<Upload className="w-4 h-4 text-blue-400" />} color="blue" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left Side: Controls & Specs */}
                                    <div className="lg:col-span-4 space-y-8">
                                        {/* Power Grid */}
                                        <div className={cardClass}>
                                            <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/20">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Power Operations</h3>
                                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", vfData.state?.running ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                                    {vfData.state?.running ? "RUNNING" : "STOPPED"}
                                                </span>
                                            </div>
                                            <div className="p-5 grid grid-cols-2 gap-3">
                                                <PowerBtn label="Start" icon={<Play />} active={!vfData.state?.running} loading={loadingAction === 'boot'} onClick={() => handlePower('boot')} />
                                                <PowerBtn label="Restart" icon={<RotateCcw />} active={!!vfData.state?.running} loading={loadingAction === 'restart'} onClick={() => handlePower('restart')} />
                                                <PowerBtn label="Stop" icon={<Square />} active={!!vfData.state?.running} loading={loadingAction === 'shutdown'} onClick={() => handlePower('shutdown')} danger />
                                                <PowerBtn label="Kill" icon={<Power />} active={!!vfData.state?.running} loading={loadingAction === 'powerOff'} onClick={() => handlePower('powerOff')} danger />
                                            </div>
                                        </div>

                                        {/* Quick Info */}
                                        <div className={cardClass}>
                                            <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/20">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Information</h3>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <InfoRow label="Cores" value={initialVfData.state?.cpu_count || "2"} icon={<Cpu className="w-3.5 h-3.5" />} />
                                                <InfoRow label="Memory" value={initialVfData.memory ? `${parseInt(initialVfData.memory)} MB` : "1024 MB"} icon={<MemoryStick className="w-3.5 h-3.5" />} />
                                                <InfoRow label="Storage" value={initialVfData.storage?.[0]?.capacity || "25 GB"} icon={<HardDrive className="w-3.5 h-3.5" />} />
                                                <InfoRow label="Network" value={`${allowance} GB / Month`} icon={<Wifi className="w-3.5 h-3.5" />} />
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => window.open(`/api/vps/${serverId}/vnc`, '_blank')}
                                                className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Terminal className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                                                    <span className="text-xs font-bold text-zinc-300">VNC Console</span>
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Side: Analytics */}
                                    <div className="lg:col-span-8 space-y-8">
                                        {/* Main Chart Card */}
                                        <div className={cardClass}>
                                            <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/20 flex justify-between items-center">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Performance Metrics</h3>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase">CPU</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase">MEM</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="h-[320px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={cpuHistory}>
                                                            <defs>
                                                                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                                            <XAxis dataKey="time" hide />
                                                            <YAxis domain={[0, 100]} hide />
                                                            <RechartsTooltip
                                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                                                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                                            />
                                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#cpuGrad)" strokeWidth={2} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bandwidth Card */}
                                        <div className={cardClass}>
                                            <div className="p-6">
                                                <div className="flex justify-between items-end mb-6">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Network Transfer</p>
                                                        <div className="flex items-baseline gap-2 mt-2">
                                                            <span className="text-3xl font-bold text-white tracking-tight">{totalNet.toFixed(1)}</span>
                                                            <span className="text-xs font-bold text-zinc-600">/ {allowance} GB</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold text-zinc-400">{netPercent.toFixed(1)}% Used</span>
                                                    </div>
                                                </div>

                                                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${netPercent}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-blue-600 rounded-full"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 mt-6 pt-6 border-t border-zinc-800/30">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Received</p>
                                                            <p className="text-sm font-bold text-white">{inbound.toFixed(2)} GB</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                                            <Upload className="w-3.5 h-3.5 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Transmitted</p>
                                                            <p className="text-sm font-bold text-white">{outbound.toFixed(2)} GB</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'network' && (
                            <motion.div
                                key="network"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="space-y-10"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <SecurityStat icon={<Wifi className="w-6 h-6" />} label="Bandwidth Tier" value="Unmetered" color="blue" />
                                    <SecurityStat icon={<Globe className="w-6 h-6" />} label="IP Allocation" value="Static" color="indigo" />
                                    <SecurityStat icon={<Zap className="w-6 h-6" />} label="Port Speed" value="10 Gbps" color="emerald" />
                                    <SecurityStat icon={<ArrowRight className="w-6 h-6" />} label="BGP Sessions" value="Enabled" color="zinc" />
                                </div>

                                <motion.div variants={itemVariants} className={cardClass}>
                                    <div className="p-10 border-b border-zinc-900/50 bg-zinc-900/10 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Asset Configuration & PTR</h3>
                                        <button className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-all">
                                            <Plus className="w-4 h-4" /> Add IPv4 Asset
                                        </button>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        {vfData.network?.primary?.ipv4.map((net: any, i: number) => (
                                            <div key={i} className="group flex flex-col lg:flex-row items-center gap-12 p-10 bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] transition-all duration-500 hover:bg-zinc-900/40">
                                                <div className="flex-1 space-y-4">
                                                    <p className={subTextClass}>Primary Infrastructure Address</p>
                                                    <h4 className="text-4xl font-black font-mono text-white tracking-tighter group-hover:text-blue-500 transition-colors flex items-center gap-4">
                                                        {net.address}
                                                    </h4>
                                                    <div className="flex items-center gap-4 pt-4">
                                                        <div className="flex-1">
                                                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">PTR / Reverse DNS</p>
                                                            <input
                                                                type="text"
                                                                placeholder="ptr.vps-node.cloud"
                                                                className="w-full bg-black border border-zinc-800 rounded-xl h-12 px-5 text-xs font-black text-zinc-400 focus:outline-none focus:border-blue-500 transition-all"
                                                            />
                                                        </div>
                                                        <button className="h-12 px-6 bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                                            Update PTR
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="h-px w-full lg:h-32 lg:w-px bg-zinc-800/50" />
                                                <div className="grid grid-cols-2 gap-12">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className={subTextClass}>Gateway</p>
                                                            <p className="text-lg font-mono font-black text-zinc-400">{net.gateway || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className={subTextClass}>Broadcast</p>
                                                            <p className="text-lg font-mono font-black text-zinc-400">192.168.1.255</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className={subTextClass}>Subnet Mask</p>
                                                            <p className="text-lg font-mono font-black text-zinc-400">{net.netmask || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className={subTextClass}>Type</p>
                                                            <p className="text-lg font-mono font-black text-emerald-500">Unfiltered</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <motion.div variants={itemVariants} className={cn(cardClass, "p-10")}>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8">Nameserver Configuration</h4>
                                        <div className="space-y-6">
                                            {[
                                                { label: 'DNS Primary', ip: '1.1.1.1' },
                                                { label: 'DNS Secondary', ip: '8.8.8.8' }
                                            ].map((dns: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-6 bg-black border border-zinc-900 rounded-2xl">
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{dns.label}</span>
                                                    <span className="text-sm font-mono font-black text-white">{dns.ip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants} className={cn(cardClass, "p-10 bg-blue-600/5 border-blue-500/20")}>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">Traffic Optimization</h4>
                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-8">
                                            Your instance is currently prioritized on our low-latency BGP routing table. High-bandwidth assets are automatically load-balanced across multiple 40G uplinks.
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 w-[15%]" />
                                            </div>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Network Load: 15%</span>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'storage' && (
                            <motion.div
                                key="storage"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="space-y-10"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <motion.div variants={itemVariants} className="lg:col-span-2 space-y-10">
                                        <div className={cardClass}>
                                            <div className="p-10 border-b border-zinc-900/50 bg-zinc-900/10 flex items-center justify-between">
                                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Infrastructure Storage Nodes</h3>
                                                <button className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-all">
                                                    <Plus className="w-4 h-4" /> Expansion Slot
                                                </button>
                                            </div>
                                            <div className="p-10 space-y-8">
                                                {vfData.storage?.map((disk: any, i: number) => (
                                                    <div key={i} className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] p-10 space-y-8 hover:border-zinc-700 transition-all duration-500">
                                                        <div className="flex flex-col md:flex-row items-center gap-10">
                                                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shrink-0">
                                                                <HardDrive className="w-10 h-10 text-black" />
                                                            </div>
                                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                                <div className="flex items-center justify-center md:justify-start gap-4">
                                                                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Enterprise NVMe Array {i + 1}</h4>
                                                                    {disk.primary && <span className="px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full tracking-widest">BOOT NODE</span>}
                                                                </div>
                                                                <div className="flex items-center justify-center md:justify-start gap-12">
                                                                    <div>
                                                                        <p className={subTextClass}>Total Capacity</p>
                                                                        <p className="text-xl font-black text-white font-mono">{disk.capacity}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className={subTextClass}>Read Throughput</p>
                                                                        <p className="text-xl font-black text-zinc-400">7.2 GB/s</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className={subTextClass}>Disk IOPS</p>
                                                                        <p className="text-xl font-black text-emerald-500">1.2M+</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="pt-8 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                    <span className="text-zinc-600">Storage Endurance (TBW)</span>
                                                                    <span className="text-white">99.8% Remaining</span>
                                                                </div>
                                                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-emerald-500 w-[100%]" />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-4">
                                                                <button className="flex-1 h-12 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-white uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all">
                                                                    Resize Disk
                                                                </button>
                                                                <button className="flex-1 h-12 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest rounded-xl hover:text-red-500 transition-all">
                                                                    Eject / Wipe
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants} className="space-y-10">
                                        <div className={cn(cardClass, "p-10")}>
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500">
                                                    <History className="w-5 h-5" />
                                                </div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Snapshot Automation</h4>
                                            </div>
                                            <div className="space-y-6 mb-10">
                                                {[
                                                    { label: 'Weekly Backup', status: 'Enabled', date: '2 days ago' },
                                                    { label: 'State Snapshot', status: 'Ready', date: '6 hours ago' }
                                                ].map((snap: any, idx: number) => (
                                                    <div key={idx} className="p-5 bg-black border border-zinc-900 rounded-2xl flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{snap.label}</p>
                                                            <p className="text-[8px] font-bold text-zinc-600 uppercase mt-1">{snap.date}</p>
                                                        </div>
                                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-md border border-emerald-500/20">{snap.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="w-full h-14 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl">
                                                Create Instant Recovery Point
                                            </button>
                                        </div>

                                        <div className={cn(cardClass, "p-10 border-indigo-500/20 bg-indigo-600/5")}>
                                            <div className="flex items-center gap-4 mb-6">
                                                <Disc className="w-5 h-5 text-indigo-500" />
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">ISO / OS Registry</h4>
                                            </div>
                                            <div className="space-y-3">
                                                {['Ubuntu 24.04 LTS', 'Windows Server 2022', 'AlmaLinux 9', 'Custom ISO...'].map(os => (
                                                    <div key={os} className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-xl group hover:border-indigo-500 transition-all cursor-pointer">
                                                        <span className="text-[10px] font-black text-zinc-500 group-hover:text-white uppercase tracking-widest">{os}</span>
                                                        <Plus className="w-4 h-4 text-zinc-800 group-hover:text-indigo-500 transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="space-y-10"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <SecurityStat icon={<ShieldCheck className="w-6 h-6" />} label="Firewall Status" value="Active" color="emerald" />
                                    <SecurityStat icon={<Lock className="w-6 h-6" />} label="Encryption" value="AES-256" color="blue" />
                                    <SecurityStat icon={<ShieldAlert className="w-6 h-6" />} label="DDoS Filtering" value="Advanced" color="indigo" />
                                    <SecurityStat icon={<Info className="w-6 h-6" />} label="Last Login" value="2m ago" color="zinc" />
                                </div>

                                <div className={cardClass}>
                                    <div className="p-10 border-b border-zinc-900/50 bg-zinc-900/10">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Security Access & Credentials</h3>
                                    </div>
                                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-zinc-900/20 border border-zinc-800/50 p-10 rounded-[2.5rem] space-y-6">
                                            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                                                <Key className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white tracking-tighter uppercase">Root Credential Reset</h4>
                                                <p className="text-xs text-zinc-500 mt-3 font-medium leading-relaxed">
                                                    Generating a new root password will immediately synchronize it with the server instance. This action is irreversible.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setResetModalOpen(true)}
                                                className="w-full h-14 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                            >
                                                Generate New Credentials
                                            </button>
                                        </div>

                                        <div className="bg-zinc-900/20 border border-zinc-800/50 p-10 rounded-[2.5rem] space-y-6">
                                            <div className="w-14 h-14 bg-blue-600/10 border border-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                                                <Shield className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white tracking-tighter uppercase">Traffic Mitigation</h4>
                                                <p className="text-xs text-zinc-500 mt-3 font-medium leading-relaxed">
                                                    Our automated DDoS protection layer is currently filtering your ingress traffic at the edge. No manual action is required.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-black border border-zinc-800 rounded-2xl">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mitigation Engine: Optimal</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className={cardClass}
                            >
                                <div className="p-10 border-b border-zinc-900/50 bg-zinc-900/10">
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Server Configuration</h3>
                                </div>
                                <div className="p-12 space-y-12 max-w-3xl">
                                    <div className="space-y-6">
                                        <label className={subTextClass}>Identity Label</label>
                                        <div className="relative group">
                                            <Server className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-white transition-colors" />
                                            <input
                                                type="text"
                                                value={newServerName}
                                                onChange={(e) => setNewServerName(e.target.value)}
                                                className="w-full h-16 bg-black border border-zinc-800 rounded-2xl pl-16 pr-8 text-white font-black text-lg focus:outline-none focus:border-white/50 transition-all"
                                                placeholder="Instance Name"
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">This is the display name used across your control panel dashboard.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <label className={subTextClass}>Infrastructure Hostname</label>
                                        <div className="relative group">
                                            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-white transition-colors" />
                                            <input
                                                type="text"
                                                value={newHostname}
                                                onChange={(e) => setNewHostname(e.target.value)}
                                                className="w-full h-16 bg-black border border-zinc-800 rounded-2xl pl-16 pr-8 text-white font-black text-lg focus:outline-none focus:border-white/50 transition-all"
                                                placeholder="node.example.com"
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Internal OS hostname for identity recognition (requires reboot to apply fully).</p>
                                    </div>

                                    <div className="pt-8 flex gap-6">
                                        <button
                                            onClick={handleUpdateSettings}
                                            disabled={loadingAction === "settings"}
                                            className="h-16 px-12 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3 disabled:opacity-50"
                                        >
                                            <Save className="w-5 h-5" />
                                            {loadingAction === "settings" ? "Synchronizing..." : "Save Modifications"}
                                        </button>
                                        <button className="h-16 px-12 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all">
                                            Discard Changes
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Modals & Overlays */}
                <AnimatePresence>
                    {resetModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setResetModalOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-zinc-950 w-full max-w-md rounded-[3rem] border border-zinc-800 p-10 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />

                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Security Protocol</h3>
                                    <button onClick={() => { setResetModalOpen(false); setNewPassword(""); }} className="w-10 h-10 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-zinc-500" />
                                    </button>
                                </div>

                                {!newPassword ? (
                                    <div className="space-y-10">
                                        <div className="bg-blue-600/5 border border-blue-600/20 p-8 rounded-[2rem] flex gap-6">
                                            <AlertCircle className="w-8 h-8 text-blue-500 shrink-0" />
                                            <p className="text-sm font-bold text-blue-200/60 leading-relaxed uppercase tracking-tighter">
                                                Authorization requested for root credential regeneration. This will initiate an internal system sync and potential service interrupt.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleResetPass}
                                            disabled={!!loadingAction}
                                            className="w-full bg-white text-black h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-50"
                                        >
                                            {loadingAction === 'reset' ? "Syncing Authority..." : "Execute Regeneration"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-black border border-zinc-800 p-10 rounded-[2.5rem] text-center shadow-inner relative overflow-hidden">
                                            <div className="absolute inset-0 bg-blue-600/5 animate-pulse" />
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6 relative z-10">New Root Asset Key</p>
                                            <p className="text-4xl font-black font-mono text-white tracking-tighter select-all relative z-10">{newPassword}</p>
                                        </div>
                                        <p className="text-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-loose">
                                            Encryption Key is volatile.<br />Save it before terminating this session.
                                        </p>
                                        <button
                                            onClick={() => { setResetModalOpen(false); setNewPassword(""); }}
                                            className="w-full bg-zinc-900 text-white h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                        >
                                            Confirm Storage
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

            // --- Sub-components ---

            function StatusBadge({status, running}: {status ?: string, running ?: boolean}) {
    return (
            <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all",
                running
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                    : "bg-red-500/5 border-red-500/20 text-red-500"
            )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", running ? "bg-emerald-500" : "bg-red-500")} />
                {running ? "Online" : "Offline"}
            </div>
            )
}

interface PowerBtnProps {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    active?: boolean;
    danger?: boolean;
}

function PowerBtn({label, icon, onClick, disabled, loading, active, danger}: PowerBtnProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading || !active}
            className={cn(
                "flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5 font-bold text-[11px] uppercase tracking-wider transition-all duration-300 border",
                loading && "bg-zinc-950/80 border-zinc-900 text-zinc-500",
                !active && !loading && "bg-zinc-950/20 border-zinc-900/40 text-zinc-800 cursor-not-allowed opacity-40",
                active && !loading && !danger && "bg-white text-black border-white hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/5",
                active && !loading && danger && "bg-zinc-900/50 text-zinc-400 border-zinc-800/80 backdrop-blur-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            )}
        >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <div className="w-3.5 h-3.5">{icon}</div>}
            <span className="hidden sm:inline">{label}</span>
        </button>
    )
}

interface InfoRowProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
}

function InfoRow({label, value, icon}: InfoRowProps) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
                <div className="text-zinc-600">{icon}</div>
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-xs font-bold text-zinc-200">{value}</span>
        </div>
    )
}

interface MetricCardProps {
    label: string;
    value: string | number;
    unit: string;
    icon: React.ReactNode;
    trend: Array<{ time?: string; value: number }>;
    color: string;
}

function MetricCard({label, value, unit, icon, trend, color}: MetricCardProps) {
    const glowClasses: Record<string, string> = {
        '#3b82f6': 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] hover:border-blue-500/40',
        '#a855f7': 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] hover:border-purple-500/40',
        '#10b981': 'hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] hover:border-emerald-500/40',
        '#f43f5e': 'hover:shadow-[0_0_30px_rgba(244,63,94,0.12)] hover:border-rose-500/40',
    };

    const activeGlow = glowClasses[color] || 'hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:border-zinc-700/80';

    return (
        <div className={cn(
            "bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-5 relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]",
            activeGlow
        )}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-950/60 border border-zinc-800/85 rounded-lg text-zinc-500 group-hover:text-white transition-all duration-300">
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold text-white tracking-tight mt-0.5">{value}<span className="text-[10px] text-zinc-600 ml-1 font-bold">{unit}</span></p>
                </div>
            </div>
            <div className="h-10 w-full opacity-20 group-hover:opacity-60 transition-all duration-500">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.15} animationDuration={1200} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

interface SimpleMetricCardProps {
    label: string;
    value: string | number;
    unit: string;
    icon: React.ReactNode;
    color: 'emerald' | 'blue';
}

function SimpleMetricCard({label, value, unit, icon, color}: SimpleMetricCardProps) {
    const iconColors = {
        emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40",
        blue: "text-blue-400 bg-blue-500/5 border-blue-500/20 group-hover:bg-blue-500/10 group-hover:border-blue-500/40"
    };

    const glowClasses = {
        emerald: "hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] hover:border-emerald-500/40",
        blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] hover:border-blue-500/40"
    };

    return (
        <div className={cn(
            "bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-5 relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]",
            glowClasses[color]
        )}>
            <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300", iconColors[color])}>
                    {icon}
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">{value}<span className="text-[10px] text-zinc-600 ml-1 font-bold">{unit}</span></p>
        </div>
    )
}

interface SecurityStatProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'emerald' | 'blue' | 'indigo' | 'zinc';
}

function SecurityStat({icon, label, value, color}: SecurityStatProps) {
    const iconColors = {
        emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40",
        blue: "text-blue-400 bg-blue-500/5 border-blue-500/20 group-hover:bg-blue-500/10 group-hover:border-blue-500/40",
        indigo: "text-indigo-400 bg-indigo-500/5 border-indigo-500/20 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/40",
        zinc: "text-zinc-400 bg-zinc-900/50 border-zinc-800/50 group-hover:bg-zinc-850 group-hover:border-zinc-700"
    };

    const glowClasses = {
        emerald: "hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] hover:border-emerald-500/40",
        blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.08)] hover:border-blue-500/40",
        indigo: "hover:shadow-[0_0_30px_rgba(99,102,241,0.08)] hover:border-indigo-500/40",
        zinc: "hover:shadow-[0_0_30px_rgba(255,255,255,0.04)] hover:border-zinc-700/80"
    };

    return (
        <div className={cn(
            "bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-5 flex items-center gap-4 group transition-all duration-500 hover:scale-[1.02]",
            glowClasses[color]
        )}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300", iconColors[color])}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-white tracking-tight mt-0.5">{value}</p>
            </div>
        </div>
    )
}

interface ChartWidgetProps {
    title: string;
    data: Array<{ time: string; value: number }>;
    color: string;
    suffix: string;
}

function ChartWidget({title, data, color, suffix}: ChartWidgetProps) {
    return (
        <motion.div variants={itemVariants} className="bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-8 hover:border-zinc-700/80 transition-all duration-500 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{title}</h3>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800/50 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Real-time Data</span>
                    </div>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.length ? data : [{ time: '', value: 0 }]}>
                        <defs>
                            <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis
                            stroke="#3f3f46"
                            fontSize={10}
                            fontWeight="bold"
                            tickFormatter={(val) => `${val}${suffix}`}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                        />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', border: '1px solid #27272a', padding: '10px' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            fill={`url(#g-${title})`}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    )
}