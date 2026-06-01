"use client";

import { useState } from "react";
import axios from "axios";
import { Calendar, X, Loader2, Check, AlertCircle } from "lucide-react";

interface RenewalDateModalProps {
    serverId: string;
    serverName: string;
    currentRenewalDate?: string | null;
    onClose: () => void;
    onUpdate: (newDate: string | null) => void;
}

export default function RenewalDateModal({
    serverId,
    serverName,
    currentRenewalDate,
    onClose,
    onUpdate
}: RenewalDateModalProps) {
    const [renewalDate, setRenewalDate] = useState(
        currentRenewalDate ? new Date(currentRenewalDate).toISOString().split('T')[0] : ''
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setLoading(true);
        setError('');
        try {
            await axios.patch(`/api/admin/server/${serverId}/renewal`, {
                renewalDate: renewalDate || null
            });
            onUpdate(renewalDate || null);
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to update renewal date');
        } finally {
            setLoading(false);
        }
    };

    const getDaysUntilRenewal = () => {
        if (!renewalDate) return null;
        const today = new Date();
        const renewal = new Date(renewalDate);
        const diffTime = renewal.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntil = getDaysUntilRenewal();

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] w-full max-w-md rounded-xl border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Set Renewal Date</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{serverName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Renewal Date</label>
                        <input
                            type="date"
                            value={renewalDate}
                            onChange={(e) => setRenewalDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:border-white focus:outline-none"
                        />
                        {renewalDate && (
                            <button
                                onClick={() => setRenewalDate('')}
                                className="text-xs text-zinc-500 hover:text-white transition-colors"
                            >
                                Clear date
                            </button>
                        )}
                    </div>

                    {/* Days Until Renewal */}
                    {daysUntil !== null && (
                        <div className={`p-3 rounded-lg border flex items-start gap-3 ${daysUntil < 0
                                ? 'bg-red-950/20 border-red-900/50'
                                : daysUntil <= 7
                                    ? 'bg-yellow-950/20 border-yellow-900/50'
                                    : 'bg-emerald-950/20 border-emerald-900/50'
                            }`}>
                            <AlertCircle className={`w-4 h-4 mt-0.5 ${daysUntil < 0
                                    ? 'text-red-400'
                                    : daysUntil <= 7
                                        ? 'text-yellow-400'
                                        : 'text-emerald-400'
                                }`} />
                            <div>
                                <p className={`text-sm font-medium ${daysUntil < 0
                                        ? 'text-red-200'
                                        : daysUntil <= 7
                                            ? 'text-yellow-200'
                                            : 'text-emerald-200'
                                    }`}>
                                    {daysUntil < 0
                                        ? `Expired ${Math.abs(daysUntil)} days ago`
                                        : daysUntil === 0
                                            ? 'Expires today'
                                            : daysUntil === 1
                                                ? 'Expires tomorrow'
                                                : `${daysUntil} days until renewal`
                                    }
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    {new Date(renewalDate).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/50 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
