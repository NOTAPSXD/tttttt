/**
 * Client Dashboard Loading State — Skeletons matching exact final layout.
 * Ensures zero layout shift (CLS 0) during server data fetching.
 */
import { StatCardSkeleton } from "@/app/components/client/StatCard";
import { ServerCardSkeleton } from "@/app/components/client/ServerCard";

export default function ClientDashboardLoading() {
    return (
        <div className="space-y-6 pb-12 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <div className="h-3 w-36 rounded bg-[#1f242d]" />
                    <div className="h-8 w-64 rounded bg-[#1f242d]" />
                    <div className="h-3.5 w-48 rounded bg-[#1f242d]" />
                </div>
                <div className="h-11 w-36 rounded-[8px] bg-[#1f242d]" />
            </div>

            {/* 4 Stat Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Server List Skeleton */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="h-5 w-24 rounded bg-[#1f242d]" />
                    <div className="h-4 w-16 rounded bg-[#1f242d]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <ServerCardSkeleton />
                    <ServerCardSkeleton />
                    <ServerCardSkeleton />
                </div>
            </div>

            {/* Traffic & Account Panel Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div
                    className="lg:col-span-2 rounded-[8px] bg-[#11141a] p-5 h-64"
                    style={{ border: "1px solid #1f242d" }}
                >
                    <div className="h-4 w-32 rounded bg-[#1f242d] mb-6" />
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="h-16 rounded bg-[#1f242d]" />
                        <div className="h-16 rounded bg-[#1f242d]" />
                        <div className="h-16 rounded bg-[#1f242d]" />
                    </div>
                    <div className="h-24 rounded bg-[#1f242d]" />
                </div>

                <div
                    className="rounded-[8px] bg-[#11141a] p-5 h-64"
                    style={{ border: "1px solid #1f242d" }}
                >
                    <div className="h-4 w-28 rounded bg-[#1f242d] mb-4" />
                    <div className="space-y-3">
                        <div className="h-7 rounded bg-[#1f242d]" />
                        <div className="h-7 rounded bg-[#1f242d]" />
                        <div className="h-7 rounded bg-[#1f242d]" />
                        <div className="h-7 rounded bg-[#1f242d]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
