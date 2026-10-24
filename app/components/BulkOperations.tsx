"use client";

import { useState } from "react";
import { CheckSquare, Square, Power, Trash2, UserPlus, Loader2 } from "lucide-react";

interface BulkOperationsProps {
    items: any[];
    type: "servers" | "users";
    onRefresh: () => void;
}

export default function BulkOperations({ items, type, onRefresh }: BulkOperationsProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(item => item.id)));
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedIds.size === 0) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/admin/bulk/${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    ids: Array.from(selectedIds),
                }),
            });

            if (response.ok) {
                setSelectedIds(new Set());
                onRefresh();
            }
        } catch (error) {
            console.error("Bulk action failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 md:p-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSelectAll}
                        className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
                    >
                        {selectedIds.size === items.length ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                        ) : (
                            <Square className="w-5 h-5 text-zinc-500" />
                        )}
                    </button>
                    <span className="text-sm text-zinc-400">
                        {selectedIds.size} of {items.length} selected
                    </span>
                </div>

                {/* Action Buttons */}
                {selectedIds.size > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {type === "servers" && (
                            <>
                                <button
                                    onClick={() => handleBulkAction("start")}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                    Start All
                                </button>
                                <button
                                    onClick={() => handleBulkAction("stop")}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                    Stop All
                                </button>
                            </>
                        )}
                        {type === "users" && (
                            <>
                                <button
                                    onClick={() => handleBulkAction("activate")}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Activate
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleBulkAction("delete")}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map(item => (
                    <div
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(item.id)
                                ? "bg-blue-500/10 border border-blue-500/20"
                                : "bg-zinc-900/50 border border-transparent hover:bg-zinc-900"
                            }`}
                    >
                        <div>
                            {selectedIds.has(item.id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-400" />
                            ) : (
                                <Square className="w-5 h-5 text-zinc-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {item.name || item.email}
                            </p>
                            {type === "servers" && item.ip && (
                                <p className="text-xs text-zinc-500 font-mono">{item.ip}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
