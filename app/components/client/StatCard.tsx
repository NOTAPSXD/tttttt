/**
 * StatCard — neutral information-dense card for dashboard metrics.
 *
 * Rules:
 * - Identical visual weight and styling for all cards (neutral surface #11141a, border #1f242d, radius 8px).
 * - Status communicated ONLY by a small StatusDot, never by card border or card color.
 * - Values semibold, not heavy-black.
 * - "-" shown when value is unknown or absent (never fake "0%" or metrics for missing data).
 * - 150ms transitions.
 */
import React from "react";
import { StatusDot } from "@/app/components/ui/primitives";
import type { ServerTone } from "@/lib/clientserver";

export interface StatCardProps {
    label: string;
    /** The main numeric or string value. Pass "-" when data is unavailable. */
    value: string;
    unit?: string;
    /** One-line context shown below the value */
    sub?: string;
    icon?: React.ReactNode;
    /** Controls the StatusDot color only. Does NOT change card background or border. */
    tone?: ServerTone;
    /** Whether to show the status dot. */
    showDot?: boolean;
    className?: string;
}

export function StatCard({
    label,
    value,
    unit,
    sub,
    icon,
    tone = "muted",
    showDot = false,
    className,
}: StatCardProps) {
    const displayValue = value && value.trim().length > 0 ? value : "-";

    return (
        <div
            className={`relative rounded-[8px] bg-[#11141a] p-4.5 transition-colors duration-150 hover:border-[#2c3448] ${className || ""}`}
            style={{
                border: "1px solid #1f242d",
            }}
        >
            {/* Header row: label + icon / status dot */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b93a1]"
                >
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {showDot && (
                        <StatusDot
                            tone={tone}
                            pulse={tone === "success"}
                        />
                    )}
                    {icon && (
                        <span className="text-[#8b93a1]" aria-hidden="true">
                            {icon}
                        </span>
                    )}
                </div>
            </div>

            {/* Value row */}
            <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-semibold leading-tight tracking-tight text-[#e6e8ec]">
                    {displayValue}
                </span>
                {unit && displayValue !== "-" && (
                    <span className="text-[12px] font-medium text-[#8b93a1]">
                        {unit}
                    </span>
                )}
            </div>

            {/* Context row */}
            {sub && (
                <p className="mt-1.5 text-[12px] leading-normal text-[#8b93a1] truncate">
                    {sub}
                </p>
            )}
        </div>
    );
}

export function StatCardSkeleton() {
    return (
        <div
            className="rounded-[8px] bg-[#11141a] p-4.5"
            style={{ border: "1px solid #1f242d" }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-20 rounded bg-[#1f242d] animate-pulse" />
                <div className="h-3.5 w-3.5 rounded bg-[#1f242d] animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded bg-[#1f242d] animate-pulse mb-2" />
            <div className="h-3 w-28 rounded bg-[#1f242d] animate-pulse" />
        </div>
    );
}

export default StatCard;
