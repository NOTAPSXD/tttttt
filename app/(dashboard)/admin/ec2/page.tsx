"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Server, Zap, Globe, Cpu, RefreshCw, UserPlus, X, Trash2, Search, Filter, ChevronRight, Activity, Calendar, MoreHorizontal, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface CloudInstance {
    instanceId: string;
    publicIp: string | null;
    instanceType: string;
    powerState: string;
    region: string;
    name: string;
    status: 'Assigned' | 'Available';
    user?: { name: string; email: string };
    userId?: string;
    dbRecord?: {
        nextRenewalAt?: string;
        _id?: string;
    };
}

export default function AdminCloudInstances() {
    const [instances, setInstances] = useState<CloudInstance[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'UNASSIGNED' | 'ASSIGNED'>('UNASSIGNED');
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [assigningInstance, setAssigningInstance] = useState<CloudInstance | null>(null);
    const [selectedUserId, setSelectedUserId] = useState("");

    const fetchInstances = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get("/api/admin/ec2");
            setInstances(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get("/api/admin/users");
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users");
        }
    };

    useEffect(() => {
        fetchInstances();
        fetchUsers();
    }, []);

    const filteredInstances = useMemo(() => {
        return instances.filter(s => {
            const matchesSearch =
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.instanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.publicIp && s.publicIp.includes(searchTerm)) ||
                (s.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase());

            if (viewMode === 'UNASSIGNED') return s.status === 'Available' && matchesSearch;
            if (viewMode === 'ASSIGNED') return s.status === 'Assigned' && matchesSearch;
            return false;
        });
    }, [instances, viewMode, searchTerm]);

    const openAssignModal = (instance: CloudInstance) => {
        setAssigningInstance(instance);
        setSelectedUserId("");
        setIsModalOpen(true);
    };

    const closeAssignModal = () => {
        setIsModalOpen(false);
        setAssigningInstance(null);
    };

    const handleAssign = async () => {
        if (!assigningInstance || !selectedUserId) return;
        setActionLoading(true);
        try {
            await axios.post("/api/admin/ec2/assign", {
                instanceId: assigningInstance.instanceId,
                userId: selectedUserId,
                name: assigningInstance.name,
                region: assigningInstance.region,
                publicIp: assigningInstance.publicIp,
                instanceType: assigningInstance.instanceType
            });
            
            closeAssignModal();
            fetchInstances();
        } catch (err: any) {
            alert(`Assignment Failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnassign = async (instanceId: string, region: string) => {
        if (!confirm("Are you sure you want to unassign this instance?")) return;
        setActionLoading(true);
        try {
            await axios.post("/api/admin/ec2/assign", {
                instanceId,
                region,
                userId: null
            });
            fetchInstances();
        } catch (err: any) {
            alert(`Unassign Failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20 p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                        <Server className="w-7 h-7 text-[#4f7cff]" />
                        Cloud Infrastructure Assets
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">Manage and assign cloud compute resources</p>
                </div>
                
                <button 
                    onClick={fetchInstances}
                    disabled={loading || actionLoading}
                    className="flex items-center gap-2 bg-[#4f7cff]/10 text-[#4f7cff] border border-[#4f7cff]/30 px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#4f7cff]/20 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Inventory
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-bold">
                    {error}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                    <button
                        onClick={() => setViewMode('UNASSIGNED')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'UNASSIGNED'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Unassigned
                        <span className="bg-zinc-950 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-800">
                            {instances.filter(s => s.status === 'Available').length}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode('ASSIGNED')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ASSIGNED'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Assigned
                        <span className="bg-zinc-950 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-800">
                            {instances.filter(s => s.status === 'Assigned').length}
                        </span>
                    </button>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search instances..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading && instances.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center py-20 text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : filteredInstances.length === 0 ? (
                    <div className="col-span-full text-center py-24 bg-[#09090b] border border-[#27272a] rounded-xl border-dashed">
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
                            <Filter className="w-6 h-6 text-zinc-500" />
                        </div>
                        <p className="text-zinc-300 font-medium">No instances match your criteria.</p>
                        <p className="text-sm text-zinc-500 mt-1">Try adjusting filters or search terms.</p>
                    </div>
                ) : (
                    filteredInstances.map((instance) => (
                        <div key={instance.instanceId} className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden hover:border-zinc-700 transition-all group flex flex-col">
                            {/* Card Header */}
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${instance.status === 'Assigned'
                                            ? "bg-[#4f7cff]/20 border-[#4f7cff]/30 text-[#4f7cff]"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                            }`}>
                                            <Server className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm truncate max-w-[150px]">{instance.name}</h3>
                                            <p className="text-xs text-zinc-500 font-mono">{instance.instanceId}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2.5 h-2.5 rounded-full ${instance.powerState === 'running' ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} title={instance.powerState} />
                                </div>

                                {/* Specs / IP */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-zinc-500" />
                                        <span className="text-xs text-zinc-300 font-mono truncate">
                                            {instance.publicIp || "No IP"}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center gap-2">
                                        <Cpu className="w-3 h-3 text-zinc-500" />
                                        <span className="text-xs text-zinc-300 font-mono truncate">
                                            {instance.instanceType}
                                        </span>
                                    </div>
                                    <div className="col-span-2 bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-zinc-500" />
                                        <span className="text-xs text-zinc-300 font-mono truncate uppercase tracking-wider">
                                            {instance.region}
                                        </span>
                                    </div>
                                </div>

                                {/* Assignment Status */}
                                {instance.status === 'Assigned' && instance.user ? (
                                    <>
                                        <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-[#4f7cff]/20 border border-[#4f7cff]/50 flex items-center justify-center text-[#4f7cff] text-xs font-bold">
                                                {instance.user.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <p className="text-sm font-medium text-white truncate">{instance.user.name}</p>
                                                <p className="text-xs text-zinc-500 truncate">{instance.user.email}</p>
                                            </div>
                                        </div>
                                        {instance.dbRecord?.nextRenewalAt && (
                                            <div className="mt-2 px-2 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 bg-zinc-900 border-zinc-800 text-zinc-400">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    Renews: {new Date(instance.dbRecord.nextRenewalAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center gap-2 text-zinc-500">
                                        <div className="w-8 h-8 rounded border border-dashed border-zinc-700 flex items-center justify-center">
                                            <UserPlus className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs">Ready for assignment</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-zinc-900/30 border-t border-zinc-800 p-3">
                                {instance.status === 'Assigned' ? (
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/admin/vps/${instance.dbRecord?._id || ''}`}
                                            className="flex-1 py-2 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Activity className="w-3 h-3" />
                                            Manage
                                        </Link>
                                        <button
                                            onClick={() => handleUnassign(instance.instanceId, instance.region)}
                                            disabled={actionLoading}
                                            className="flex-1 py-2 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            Unassign
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => openAssignModal(instance)}
                                        className="w-full py-2 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        Assign User <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Assignment Modal */}
            <AnimatePresence>
                {isModalOpen && assigningInstance && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#09090b] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
                        >
                            <button 
                                onClick={closeAssignModal}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h2 className="text-xl font-bold text-white mb-2">Assign Instance</h2>
                            <p className="text-sm text-zinc-400 mb-6">
                                Assign <span className="text-[#4f7cff] font-mono">{assigningInstance.instanceId}</span> to a user.
                            </p>
                            
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Select User</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white outline-none focus:border-[#4f7cff]/50 appearance-none"
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                        >
                                            <option value="">-- Choose a user --</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleAssign}
                                    disabled={!selectedUserId || actionLoading}
                                    className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                                >
                                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirm Assignment
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
