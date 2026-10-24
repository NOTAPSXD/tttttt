"use client";

import { useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Search, Server, User, Globe, Check, Loader2, UserPlus, Link2,
    X, MoreHorizontal, Filter, AlertCircle, ChevronRight, Calendar, Activity,
    Shield, Mail, Copy, CheckCheck
} from "lucide-react";
import { toast } from "sonner";
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
    const [userSearch, setUserSearch] = useState("");
    const [notifyUser, setNotifyUser] = useState(true);
    const [loading, setLoading] = useState(false);
    const [copiedIp, setCopiedIp] = useState<string | null>(null);

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

    // Filter users inside the assign modal
    const filteredUsers = useMemo(() => {
        const q = userSearch.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u =>
            (u.name || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.role || "").toLowerCase().includes(q)
        );
    }, [users, userSearch]);

    const selectedUser = useMemo(() => {
        return users.find(u => u.id === selectedUserId) || null;
    }, [users, selectedUserId]);

    // --- Actions ---
    const openAssignModal = (server: ServerProps) => {
        setSelectedServer(server);
        setSelectedUserId("");
        setUserSearch("");
        setNotifyUser(true);
        setIsModalOpen(true);
    };

    const closeAssignModal = () => {
        setIsModalOpen(false);
        setSelectedServer(null);
        setSelectedUserId("");
        setUserSearch("");
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIp(text);
        toast.success(`Copied ${label} to clipboard`);
        setTimeout(() => setCopiedIp(null), 2000);
    };

    const handleAssign = async () => {
        if (!selectedUserId || !selectedServer) {
            toast.error("Please select a client to assign");
            return;
        }
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
                        localId: res.data.server?.id || res.data.id || s.localId
                    };
                }
                return s;
            }));

            toast.success(`Server "${selectedServer.name}" assigned to ${user?.name || user?.email}`);
            closeAssignModal();
            router.refresh();
        } catch (e: any) {
            const msg = e.response?.data?.error || e.response?.data?.message || (typeof e.response?.data === 'string' ? e.response.data : e.message);
            toast.error(`Assignment Failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUnassign = async (server: ServerProps) => {
        if (!confirm(`Revoke access for ${server.assignedTo?.email}?`)) return;
        setLoading(true);
        try {
            const targetId = server.localId || server.id;
            await axios.post(`/api/admin/server/${targetId}/unassign`);

            setServers(prev => prev.map(s => {
                if (s.id === server.id) {
                    return { ...s, assignedTo: null, localId: undefined };
                }
                return s;
            }));
            toast.success(`Server unassigned successfully`);
            router.refresh();
        } catch (e: any) {
            const msg = e.response?.data?.error || e.response?.data?.message || (typeof e.response?.data === 'string' ? e.response.data : e.message);
            toast.error(`Unassign Failed: ${msg}`);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredServers.map((server) => {
                    const primaryIp = server.network?.primary?.ipv4?.[0]?.address;
                    return (
                        <div key={server.id} className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden hover:border-zinc-700 transition-all group flex flex-col">

                            {/* Card Header */}
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${server.assignedTo
                                            ? "bg-zinc-900 border-zinc-800 text-white"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                            }`}>
                                            <Server className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-white text-sm truncate">{server.name}</h3>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(server.id, "Server ID")}
                                                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1 transition-colors text-left"
                                                title="Click to copy server ID"
                                            >
                                                <span>ID: {server.id.length > 16 ? `${server.id.substring(0, 14)}...` : server.id}</span>
                                                <Copy className="w-2.5 h-2.5 opacity-60" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${server.state?.running
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${server.state?.running ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                                            {server.state?.running ? "Running" : "Offline"}
                                        </span>
                                    </div>
                                </div>

                                {/* Specs / IP */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        type="button"
                                        disabled={!primaryIp}
                                        onClick={() => primaryIp && copyToClipboard(primaryIp, "IP Address")}
                                        className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 rounded px-2 py-1.5 flex items-center justify-between text-left transition-colors group/ip"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                                            <span className="text-xs text-zinc-300 font-mono truncate">
                                                {primaryIp || "No IP"}
                                            </span>
                                        </div>
                                        {primaryIp && (
                                            <Copy className="w-3 h-3 text-zinc-600 group-hover/ip:text-zinc-300 opacity-0 group-hover/ip:opacity-100 transition-opacity shrink-0 ml-1" />
                                        )}
                                    </button>
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
                                        <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                                                    {(server.assignedTo.name?.[0] || server.assignedTo.email?.[0] || "U").toUpperCase()}
                                                </div>
                                                <div className="overflow-hidden min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{server.assignedTo.name || "Client"}</p>
                                                    <p className="text-xs text-zinc-400 font-mono truncate">{server.assignedTo.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRenewalServer(server);
                                                    setIsRenewalModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                                                title="Set / Edit Renewal Date"
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        {/* Renewal Date Badge */}
                                        {server.renewalDate && (() => {
                                            const today = new Date();
                                            const renewal = new Date(server.renewalDate);
                                            const diffTime = renewal.getTime() - today.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            return (
                                                <div
                                                    onClick={() => {
                                                        setRenewalServer(server);
                                                        setIsRenewalModalOpen(true);
                                                    }}
                                                    className={`mt-2 px-2.5 py-1.5 rounded-md border text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${diffDays < 0
                                                        ? 'bg-red-950/20 border-red-900/50 text-red-400 hover:bg-red-950/40'
                                                        : diffDays <= 7
                                                            ? 'bg-yellow-950/20 border-yellow-900/50 text-yellow-400 hover:bg-yellow-950/40'
                                                            : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/40'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-1.5">
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
                                                    <span className="text-[10px] opacity-70 underline">Edit</span>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <div className="mt-2 pt-3 border-t border-zinc-800 flex items-center gap-2 text-zinc-500">
                                        <div className="w-8 h-8 rounded border border-dashed border-zinc-700 flex items-center justify-center shrink-0">
                                            <UserPlus className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-zinc-400">Available Server</p>
                                            <p className="text-[11px] text-zinc-600">Unassigned • Ready to link</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-zinc-900/30 border-t border-zinc-800 p-3">
                                {server.assignedTo ? (
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/admin/vps/${server.localId || server.id}`}
                                            className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Activity className="w-3 h-3" />
                                            Manage
                                        </Link>
                                        <button
                                            onClick={() => handleUnassign(server)}
                                            disabled={loading}
                                            className="flex-1 py-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-xs font-medium transition-colors"
                                        >
                                            Unassign
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/admin/vps/${server.localId || server.id}`}
                                            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Activity className="w-3 h-3" />
                                            Manage
                                        </Link>
                                        <button
                                            onClick={() => openAssignModal(server)}
                                            className="flex-[2] py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            Assign Client <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
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

            {/* Assign Modal */}
            {isModalOpen && selectedServer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] w-full max-w-lg rounded-xl border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/40">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-blue-400" />
                                    Assign Server to Client
                                </h3>
                                <p className="text-xs text-zinc-400 mt-1">
                                    <span className="font-semibold text-zinc-200">{selectedServer.name}</span>
                                    <span className="mx-1.5 text-zinc-600">•</span>
                                    <span className="font-mono text-zinc-500">{selectedServer.id}</span>
                                </p>
                            </div>
                            <button
                                onClick={closeAssignModal}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            {/* Selected Client Preview Card */}
                            {selectedUser ? (
                                <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-950/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-sm shrink-0">
                                            {(selectedUser.name?.[0] || selectedUser.email?.[0] || "U").toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-white truncate">{selectedUser.name || "User"}</p>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                                    {selectedUser.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 font-mono truncate">{selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUserId("")}
                                        className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            Select Client Account
                                        </label>
                                        <span className="text-[11px] text-zinc-500 font-medium">
                                            {filteredUsers.length} available
                                        </span>
                                    </div>

                                    {/* Client Search Bar */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            placeholder="Search by name, email, or role..."
                                            autoFocus
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-zinc-600 transition-colors"
                                        />
                                        {userSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setUserSearch("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* User Scroll List */}
                                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-zinc-800/80 rounded-lg p-1.5 bg-zinc-950/50">
                                        {filteredUsers.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-zinc-500">
                                                No users found matching &quot;{userSearch}&quot;
                                            </div>
                                        ) : (
                                            filteredUsers.map((u) => {
                                                const isSelected = selectedUserId === u.id;
                                                const roleColor =
                                                    u.role?.toUpperCase() === "ADMIN"
                                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                                        : u.role?.toUpperCase() === "SUPPORT"
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                            : "bg-zinc-800 text-zinc-400 border-zinc-700";

                                                return (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => setSelectedUserId(u.id)}
                                                        className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isSelected
                                                            ? "bg-blue-600/15 border border-blue-500/40 text-white"
                                                            : "hover:bg-zinc-900 border border-transparent text-zinc-300"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
                                                                {(u.name?.[0] || u.email?.[0] || "U").toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0 text-left">
                                                                <p className="text-xs font-semibold text-white truncate">
                                                                    {u.name || "Unnamed User"}
                                                                </p>
                                                                <p className="text-[11px] text-zinc-400 font-mono truncate">
                                                                    {u.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${roleColor}`}>
                                                                {u.role}
                                                            </span>
                                                            {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Email Notification Option */}
                            <div
                                onClick={() => setNotifyUser(!notifyUser)}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${notifyUser
                                    ? "bg-blue-950/20 border-blue-900/50"
                                    : "bg-zinc-900/50 border-zinc-800"
                                    }`}
                            >
                                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${notifyUser ? "bg-blue-600 border-blue-600" : "border-zinc-600"
                                    }`}>
                                    {notifyUser && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${notifyUser ? "text-blue-200" : "text-zinc-400"}`}>
                                        <Mail className="w-3.5 h-3.5" />
                                        Send Email Notification
                                    </p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                        Client will receive a branded VexaNode onboarding email with dashboard link.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-3">
                            <button
                                onClick={closeAssignModal}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedUserId || loading}
                                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
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
