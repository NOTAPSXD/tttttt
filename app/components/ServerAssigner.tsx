"use client";

import { useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Search, Server, User, Globe, Check, Loader2, UserPlus, Link2,
    X, MoreHorizontal, Filter, AlertCircle, ChevronRight, Calendar, Activity
} from "lucide-react";
import RenewalDateModal from "./RenewalDateModal";

// --- Types ---
interface ServerProps {
    id: string;
    name: string;
    virtfusionId: string;
    assignedTo?: {
        id: string;
        name: string;
        email: string;
    } | null;
    network?: {
        primary?: {
            ipv4?: { address: string }[];
        };
    };
    localId?: string;
    state?: {
        running?: boolean;
    };
    cpu?: string;
    memory?: string;
    renewalDate?: string | null;
}

interface UserProps {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function ServerAssigner({ servers: initialServers, users }: { servers: ServerProps[], users: UserProps[] }) {
    const [servers, setServers] = useState(initialServers);
    const [viewMode, setViewMode] = useState<'UNASSIGNED' | 'ASSIGNED'>('UNASSIGNED');
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedServer, setSelectedServer] = useState<ServerProps | null>(null);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [notifyUser, setNotifyUser] = useState(true);
    const [loading, setLoading] = useState(false);

    // Renewal Date Modal State
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [renewalServer, setRenewalServer] = useState<ServerProps | null>(null);

    const router = useRouter();

    // --- Filtering Logic ---
    const filteredServers = useMemo(() => {
        return servers.filter(s => {
            const matchesSearch =
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.id.toString().includes(searchTerm) ||
                s.network?.primary?.ipv4?.[0]?.address?.includes(searchTerm) ||
                (s.assignedTo?.email || "").toLowerCase().includes(searchTerm);

            if (viewMode === 'UNASSIGNED') return !s.assignedTo && matchesSearch;
            if (viewMode === 'ASSIGNED') return s.assignedTo && matchesSearch;
            return false;
        });
    }, [servers, viewMode, searchTerm]);

    // --- Actions ---
    const openAssignModal = (server: ServerProps) => {
        setSelectedServer(server);
        setSelectedUserId("");
        setNotifyUser(true);
        setIsModalOpen(true);
    };

    const closeAssignModal = () => {
        setIsModalOpen(false);
        setSelectedServer(null);
    };

    const handleAssign = async () => {
        if (!selectedUserId || !selectedServer) return;
        setLoading(true);
        try {
            const res = await axios.post("/api/admin/assign", {
                virtfusionId: selectedServer.id,
                userId: selectedUserId,
                notify: notifyUser
            });

            // Optimistic Update
            const user = users.find(u => u.id === selectedUserId);
            setServers(prev => prev.map(s => {
                if (s.id === selectedServer.id) {
                    return {
                        ...s,
                        assignedTo: user ? { id: user.id, name: user.name, email: user.email } : null,
                        localId: res.data.id
                    };
                }
                return s;
            }));

            closeAssignModal();
            router.refresh();
        } catch (e: any) {
            alert(`Assignment Failed: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUnassign = async (server: ServerProps) => {
        if (!confirm(`Revoke access for ${server.assignedTo?.email}?`)) return;
        setLoading(true);
        try {
            const targetId = server.localId || server.id;
            await axios.post(`/api/admin/server/${targetId}/unassign`); // Ensure API route matches
            // Often unassign endpoints might just need the DB ID

            setServers(prev => prev.map(s => {
                if (s.id === server.id) {
                    return { ...s, assignedTo: null, localId: undefined };
                }
                return s;
            }));
            router.refresh();
        } catch (e: any) {
            alert(`Unassign Failed: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
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
                            {servers.filter(s => !s.assignedTo).length}
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
                            {servers.filter(s => s.assignedTo).length}
                        </span>
                    </button>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name, IP, or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredServers.map((server) => (
                    <div key={server.id} className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden hover:border-zinc-700 transition-all group flex flex-col">

                        {/* Card Header */}
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${server.assignedTo
                                        ? "bg-zinc-900 border-zinc-800 text-white"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                        }`}>
                                        <Server className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm truncate max-w-[150px]">{server.name}</h3>
                                        <p className="text-xs text-zinc-500 font-mono">ID: {server.id}</p>
                                    </div>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${server.state?.running ? "bg-emerald-500" : "bg-zinc-700"}`} title={server.state?.running ? "Running" : "Offline"} />
                            </div>

                            {/* Specs / IP */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-zinc-500" />
                                    <span className="text-xs text-zinc-300 font-mono truncate">
                                        {server.network?.primary?.ipv4?.[0]?.address || "No IP"}
                                    </span>
                                </div>
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">CPU</span>
                                    <span className="text-xs text-zinc-300 font-mono truncate">
                                        {server.cpu || "N/A"}
                                    </span>
                                </div>
                            </div>

                            {/* Assignment Status */}
                            {server.assignedTo ? (
                                <>
                                    <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-blue-900/20 border border-blue-900/50 flex items-center justify-center text-blue-400 text-xs font-bold">
                                            {server.assignedTo.name?.[0].toUpperCase()}
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <p className="text-sm font-medium text-white truncate">{server.assignedTo.name}</p>
                                            <p className="text-xs text-zinc-500 truncate">{server.assignedTo.email}</p>
                                        </div>
                                    </div>
                                    {/* Renewal Date Badge */}
                                    {server.renewalDate && (() => {
                                        const today = new Date();
                                        const renewal = new Date(server.renewalDate);
                                        const diffTime = renewal.getTime() - today.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                        return (
                                            <div className={`mt-2 px-2 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 ${diffDays < 0
                                                    ? 'bg-red-950/20 border-red-900/50 text-red-400'
                                                    : diffDays <= 7
                                                        ? 'bg-yellow-950/20 border-yellow-900/50 text-yellow-400'
                                                        : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
                                                }`}>
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    {diffDays < 0
                                                        ? `Expired ${Math.abs(diffDays)}d ago`
                                                        : diffDays === 0
                                                            ? 'Expires today'
                                                            : `${diffDays}d until renewal`
                                                    }
                                                </span>
                                            </div>
                                        );
                                    })()}
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
                            {server.assignedTo ? (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/admin/vps/${server.localId || server.id}`}
                                        className="flex-1 py-2 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Activity className="w-3 h-3" />
                                        Manage
                                    </Link>
                                    <button
                                        onClick={() => handleUnassign(server)}
                                        disabled={loading}
                                        className="flex-1 py-2 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-xs font-medium transition-colors"
                                    >
                                        Unassign
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/admin/vps/${server.localId || server.id}`}
                                        className="flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Activity className="w-3 h-3" />
                                        Manage
                                    </Link>
                                    <button
                                        onClick={() => openAssignModal(server)}
                                        className="flex-[2] py-2 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        Assign User <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredServers.length === 0 && (
                <div className="text-center py-24 bg-[#09090b] border border-[#27272a] rounded-xl border-dashed">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
                        <Filter className="w-6 h-6 text-zinc-500" />
                    </div>
                    <p className="text-zinc-300 font-medium">No servers match your criteria.</p>
                    <p className="text-sm text-zinc-500 mt-1">Try adjusting filters or search terms.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedServer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] w-full max-w-md rounded-xl border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">Assign Server</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">ID: {selectedServer.id} • {selectedServer.name}</p>
                            </div>
                            <button onClick={closeAssignModal} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Select Client</label>
                                <div className="relative">
                                    <select
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:border-white focus:outline-none appearance-none"
                                    >
                                        <option value="">Choose a user...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.email} ({u.name})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => setNotifyUser(!notifyUser)}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${notifyUser
                                    ? "bg-blue-950/20 border-blue-900/50"
                                    : "bg-zinc-900/50 border-zinc-800"
                                    }`}
                            >
                                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${notifyUser ? "bg-blue-500 border-blue-500" : "border-zinc-600"
                                    }`}>
                                    {notifyUser && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${notifyUser ? "text-blue-200" : "text-zinc-400"}`}>Send Email Notification</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">User will be alerted via email.</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={closeAssignModal}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedUserId || loading}
                                className="px-6 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Renewal Date Modal */}
            {isRenewalModalOpen && renewalServer && (
                <RenewalDateModal
                    serverId={renewalServer.localId || renewalServer.id}
                    serverName={renewalServer.name}
                    currentRenewalDate={renewalServer.renewalDate}
                    onClose={() => {
                        setIsRenewalModalOpen(false);
                        setRenewalServer(null);
                    }}
                    onUpdate={(newDate) => {
                        setServers(prev => prev.map(s =>
                            s.id === renewalServer.id
                                ? { ...s, renewalDate: newDate }
                                : s
                        ));
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}