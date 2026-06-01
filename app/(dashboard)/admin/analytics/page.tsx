"use client";

import { useEffect, useState } from "react";
import AnalyticsDashboard from "@/app/components/AnalyticsDashboard";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch("/api/admin/analytics");
            if (response.ok) {
                const analyticsData = await response.json();
                setData(analyticsData);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-20 md:pb-10 max-w-[1600px] mx-auto p-4 md:p-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Analytics</h2>
                <p className="text-sm md:text-base text-zinc-400">
                    Comprehensive insights into platform performance and user activity
                </p>
            </div>

            {/* Analytics Dashboard */}
            {data && <AnalyticsDashboard data={data} />}
        </div>
    );
}
