"use client";

import { useState } from "react";
import { Power, RotateCw, Square, Loader2 } from "lucide-react";

interface QuickActionsProps {
    serverId: number;
    virtfusionId: number;
    isRunning: boolean;
}

export default function QuickActions({ serverId, virtfusionId, isRunning }: QuickActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [status, setStatus] = useState(isRunning);

    const handleAction = async (action: "start" | "stop" | "restart") => {
        setLoading(action);
        try {
            const response = await fetch(`/api/servers/${serverId}/control`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, virtfusionId }),
            });

            if (response.ok) {
                const data = await response.json();
                if (action === "start") setStatus(true);
                if (action === "stop") setStatus(false);
                // Show success notification
            }
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 md:gap-3">
            <button
                onClick={() => handleAction(status ? "stop" : "start")}
                disabled={loading !== null}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${status
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
            >
                {loading === (status ? "stop" : "start") ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : status ? (
                    <Square className="w-4 h-4" />
                ) : (
                    <Power className="w-4 h-4" />
                )}
                {status ? "Stop" : "Start"}
            </button>

            <button
                onClick={() => handleAction("restart")}
                disabled={loading !== null || !status}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading === "restart" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <RotateCw className="w-4 h-4" />
                )}
                Restart
            </button>
        </div>
    );
}
