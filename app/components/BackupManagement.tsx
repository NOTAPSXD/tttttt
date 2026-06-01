"use client";

import { useState, useEffect } from "react";
import { Database, Download, Upload, Trash2, Clock, CheckCircle, Loader2, Plus } from "lucide-react";

interface Backup {
    id: string;
    name: string;
    size: string;
    createdAt: Date;
    status: "completed" | "in_progress" | "failed";
}

export default function BackupManagement({ serverId }: { serverId: string }) {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchBackups();
    }, [serverId]);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/vps/${serverId}/backups`);
            if (response.ok) {
                const data = await response.json();
                setBackups(data);
            }
        } catch (error) {
            console.error("Failed to fetch backups:", error);
        } finally {
            setLoading(false);
        }
    };

    const createBackup = async () => {
        setCreating(true);
        try {
            const response = await fetch(`/api/vps/${serverId}/backups`, {
                method: "POST",
            });
            if (response.ok) {
                await fetchBackups();
            }
        } catch (error) {
            console.error("Failed to create backup:", error);
        } finally {
            setCreating(false);
        }
    };

    const restoreBackup = async (backupId: string) => {
        if (!confirm("Are you sure you want to restore this backup? This will overwrite current data.")) return;

        try {
            const response = await fetch(`/api/vps/${serverId}/backups/${backupId}/restore`, {
                method: "POST",
            });
            if (response.ok) {
                alert("Backup restore initiated successfully!");
            }
        } catch (error) {
            console.error("Failed to restore backup:", error);
        }
    };

    const deleteBackup = async (backupId: string) => {
        if (!confirm("Are you sure you want to delete this backup?")) return;

        try {
            const response = await fetch(`/api/vps/${serverId}/backups/${backupId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                await fetchBackups();
            }
        } catch (error) {
            console.error("Failed to delete backup:", error);
        }
    };

    return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Database className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Backup Management</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Create and restore server backups</p>
                    </div>
                </div>
                <button
                    onClick={createBackup}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                    Create Backup
                </button>
            </div>

            {/* Backups List */}
            <div className="divide-y divide-zinc-800">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">Loading backups...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div className="p-8 text-center">
                        <Database className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No backups found</p>
                        <p className="text-xs text-zinc-600 mt-1">Create your first backup to get started</p>
                    </div>
                ) : (
                    backups.map(backup => (
                        <div key={backup.id} className="p-4 hover:bg-black transition-colors">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${backup.status === "completed"
                                        ? "bg-emerald-950/30 border-emerald-900/50"
                                        : backup.status === "in_progress"
                                            ? "bg-blue-950/30 border-blue-900/50"
                                            : "bg-red-950/30 border-red-900/50"
                                        }`}>
                                        {backup.status === "completed" ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        ) : backup.status === "in_progress" ? (
                                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                        ) : (
                                            <Database className="w-5 h-5 text-red-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-white truncate">{backup.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-zinc-500">{backup.size}</span>
                                            <span className="text-zinc-700">•</span>
                                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                                                <Clock className="w-3 h-3" />
                                                {new Date(backup.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {backup.status === "completed" && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => restoreBackup(backup.id)}
                                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
                                            title="Restore backup"
                                        >
                                            <Upload className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup.id)}
                                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
                                            title="Delete backup"
                                        >
                                            <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
