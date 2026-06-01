"use client";

import { useState } from "react";
import { X, Edit3, Loader2, Check } from "lucide-react";

interface RenameServerModalProps {
    serverId: string;
    currentName: string;
    onClose: () => void;
    onSuccess: (newName: string) => void;
}

export default function RenameServerModal({ serverId, currentName, onClose, onSuccess }: RenameServerModalProps) {
    const [newName, setNewName] = useState(currentName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newName.trim() === currentName) {
            onClose();
            return;
        }

        if (newName.trim().length === 0) {
            setError("Server name cannot be empty");
            return;
        }

        if (newName.length > 50) {
            setError("Server name is too long (max 50 characters)");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/api/vps/${serverId}/rename`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() })
            });

            if (response.ok) {
                onSuccess(newName.trim());
                onClose();
            } else {
                const data = await response.json();
                setError(data.error || "Failed to rename server");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Edit3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Rename Server</h3>
                            <p className="text-xs text-zinc-500">Update your server display name</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-zinc-900 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Server Name
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-white focus:ring-2 focus:ring-white/20 outline-none transition-all"
                            placeholder="Enter server name"
                            maxLength={50}
                            autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-zinc-500">
                                Choose a memorable name for your server
                            </p>
                            <p className="text-xs text-zinc-600">
                                {newName.length}/50
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || newName.trim() === currentName}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-white/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
