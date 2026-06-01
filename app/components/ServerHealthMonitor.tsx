"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle, XCircle, Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface HealthMetric {
    name: string;
    status: "healthy" | "warning" | "critical";
    value: string;
    threshold: string;
    trend?: "up" | "down" | "stable";
}

export default function ServerHealthMonitor({ serverId }: { serverId: string }) {
    const [health, setHealth] = useState<HealthMetric[]>([]);
    const [overallStatus, setOverallStatus] = useState<"healthy" | "warning" | "critical">("healthy");
    const [loading, setLoading] = useState(true);
    const [lastCheck, setLastCheck] = useState<Date>(new Date());

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [serverId]);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            // Mock data - replace with actual API call
            const mockHealth: HealthMetric[] = [
                {
                    name: "CPU Usage",
                    status: Math.random() > 0.7 ? "warning" : "healthy",
                    value: `${Math.floor(Math.random() * 60 + 20)}%`,
                    threshold: "< 80%",
                    trend: Math.random() > 0.5 ? "up" : "down"
                },
                {
                    name: "Memory Usage",
                    status: Math.random() > 0.8 ? "warning" : "healthy",
                    value: `${Math.floor(Math.random() * 50 + 30)}%`,
                    threshold: "< 90%",
                    trend: Math.random() > 0.5 ? "up" : "down"
                },
                {
                    name: "Disk Space",
                    status: Math.random() > 0.9 ? "critical" : "healthy",
                    value: `${Math.floor(Math.random() * 40 + 40)}%`,
                    threshold: "< 95%",
                    trend: "up"
                },
                {
                    name: "Network Latency",
                    status: "healthy",
                    value: `${Math.floor(Math.random() * 30 + 10)}ms`,
                    threshold: "< 100ms",
                    trend: "stable"
                },
                {
                    name: "Uptime",
                    status: "healthy",
                    value: "99.9%",
                    threshold: "> 99%",
                    trend: "stable"
                }
            ];

            setHealth(mockHealth);

            // Calculate overall status
            const hasCritical = mockHealth.some(m => m.status === "critical");
            const hasWarning = mockHealth.some(m => m.status === "warning");
            setOverallStatus(hasCritical ? "critical" : hasWarning ? "warning" : "healthy");
            setLastCheck(new Date());
        } catch (error) {
            console.error("Failed to fetch health:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case "critical":
                return <XCircle className="w-5 h-5 text-red-400" />;
            default:
                return <Activity className="w-5 h-5 text-zinc-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "border-emerald-900/50 bg-emerald-950/30";
            case "warning":
                return "border-amber-900/50 bg-amber-950/30";
            case "critical":
                return "border-red-900/50 bg-red-950/30";
            default:
                return "border-zinc-800 bg-zinc-900/30";
        }
    };

    const getTrendIcon = (trend?: string) => {
        if (!trend || trend === "stable") return null;
        return trend === "up"
            ? <TrendingUp className="w-3 h-3 text-red-400" />
            : <TrendingDown className="w-3 h-3 text-emerald-400" />;
    };

    return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${getStatusColor(overallStatus)}`}>
                        {getStatusIcon(overallStatus)}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Server Health</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Last checked: {lastCheck.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh health check"
                >
                    <Loader2 className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Overall Status Banner */}
            <div className={`px-5 py-3 border-b border-zinc-800 ${getStatusColor(overallStatus)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getStatusIcon(overallStatus)}
                        <span className="text-sm font-bold text-white">
                            {overallStatus === "healthy" ? "All Systems Operational" :
                                overallStatus === "warning" ? "Minor Issues Detected" :
                                    "Critical Issues Detected"}
                        </span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">
                        {health.filter(h => h.status === "healthy").length}/{health.length} OK
                    </span>
                </div>
            </div>

            {/* Health Metrics */}
            <div className="divide-y divide-zinc-800">
                {loading && health.length === 0 ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">Checking server health...</p>
                    </div>
                ) : (
                    health.map((metric, index) => (
                        <div key={index} className="p-4 hover:bg-zinc-900/50 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getStatusColor(metric.status)}`}>
                                        {getStatusIcon(metric.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold text-white">{metric.name}</h4>
                                            {getTrendIcon(metric.trend)}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Threshold: {metric.threshold}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">{metric.value}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${metric.status === "healthy"
                                            ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50"
                                            : metric.status === "warning"
                                                ? "bg-amber-950/30 text-amber-400 border-amber-900/50"
                                                : "bg-red-950/30 text-red-400 border-red-900/50"
                                        }`}>
                                        {metric.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-zinc-900/30 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                    Auto-refreshes every 30 seconds • Click refresh icon to update manually
                </p>
            </div>
        </div>
    );
}
