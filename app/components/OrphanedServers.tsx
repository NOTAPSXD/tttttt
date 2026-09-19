"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";

interface Orphan {
    id: string;
    providerServerId: string;
    providerType?: string;
    name: string;
    ip: string | null;
    user: { id: string | null; name: string; email: string };
    deletedOnProviderAt?: string | null;
}

export default function OrphanedServers() {
    const [orphans, setOrphans] = useState<Orphan[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await axios.get<{ orphans: Orphan[] }>("/api/admin/server/orphans");
            setOrphans(res.data.orphans || []);
        } catch (e: any) {
            setMessage({ ok: false, text: e?.response?.data?.error || "Failed to load orphaned servers" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const removeOrphans = async (ids: string[]) => {
        if (ids.length === 0) return;
        setRemoving(true);
        setMessage(null);
        try {
            const res = await axios.delete<{ deletedCount: number }>("/api/admin/server/orphans", {
                data: { ids },
            });
            setMessage({ ok: true, text: `${res.data.deletedCount} stale assignment(s) removed from database.` });
            await load();
        } catch (e: any) {
            setMessage({ ok: false, text: e?.response?.data?.error || "Failed to remove orphaned servers" });
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#09090b] animate-pulse">
                <div className="p-5 border-b border-[#27272a]">
                    <div className="w-56 h-4 bg-zinc-800 rounded" />
                </div>
                <div className="p-5 text-sm text-zinc-500">Scanning provider for deleted servers…</div>
            </div>
        );
    }

    return (
        <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#09090b]">
            <div className="p-5 border-b border-[#27272a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        Orphaned Assignments
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                        Servers that still exist in the database but are no longer on the provider (VirtFusion).
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={load}
                        disabled={removing}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Rescan
                    </button>
                    {orphans.length > 0 && (
                        <button
                            onClick={() => removeOrphans(orphans.map((o) => o.id))}
                            disabled={removing}
                            className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/30 hover:bg-red-600/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Remove All ({orphans.length})
                        </button>
                    )}
                </div>
            </div>

            {message && (
                <div className={`mx-5 mt-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    message.ok
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                    {message.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {message.text}
                </div>
            )}

            <div className="p-0 overflow-x-auto">
                {orphans.length === 0 ? (
                    <div className="p-6 text-sm text-zinc-500">
                        No orphaned assignments. Every server in the database still exists on the provider.
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-zinc-950 border-b border-[#27272a]">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Server</th>
                                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Assigned To</th>
                                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {orphans.map((o) => (
                                <tr key={o.id} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <p className="text-sm font-semibold text-white">{o.name}</p>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{o.providerServerId}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <p className="text-sm text-zinc-200">{o.user?.name || "Unknown"}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{o.user?.email || "—"}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase">
                                            Gone from provider
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            onClick={() => removeOrphans([o.id])}
                                            disabled={removing}
                                            className="text-red-400 hover:text-red-300 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}