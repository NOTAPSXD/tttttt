import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type VexaStatusTone = "online" | "offline" | "provisioning" | "suspended" | "muted" | "warning";

const toneClasses: Record<VexaStatusTone, string> = {
    online:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    offline:      "bg-red-500/10 text-red-400 border-red-500/25",
    suspended:    "bg-amber-500/10 text-amber-400 border-amber-500/25",
    provisioning: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    warning:      "bg-amber-500/10 text-amber-400 border-amber-500/25",
    muted:        "bg-[#141820] text-[#8b93a1] border-[#1f242d]",
};

const dotClasses: Record<VexaStatusTone, string> = {
    online:       "bg-emerald-400",
    offline:      "bg-red-400",
    suspended:    "bg-amber-400",
    provisioning: "bg-blue-400",
    warning:      "bg-amber-400",
    muted:        "bg-[#8b93a1]",
};

export function Badge({
    className,
    children,
}: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                toneClasses.muted,
                className,
            )}
        >
            {children}
        </span>
    );
}

/**
 * Standard StatusBadge using VexaNode internal statuses:
 * Online, Offline, Provisioning, Suspended (plus generic muted/warning fallback)
 */
export function StatusBadge({
    label,
    tone = "muted",
    pulse = true,
    className,
}: {
    label: string;
    tone?: VexaStatusTone | "success" | "danger" | "info";
    pulse?: boolean;
    className?: string;
}) {
    // Normalization from legacy tones to VexaStatusTone
    let normalizedTone: VexaStatusTone = "muted";
    if (tone === "online" || tone === "success") normalizedTone = "online";
    else if (tone === "offline" || tone === "danger") normalizedTone = "offline";
    else if (tone === "provisioning" || tone === "info") normalizedTone = "provisioning";
    else if (tone === "suspended" || tone === "warning") normalizedTone = "suspended";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border select-none",
                toneClasses[normalizedTone],
                className,
            )}
        >
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    dotClasses[normalizedTone],
                    pulse && normalizedTone === "online" && "animate-pulse",
                    pulse && normalizedTone === "provisioning" && "animate-ping"
                )}
                aria-hidden="true"
            />
            <span>{label}</span>
        </span>
    );
}

export default StatusBadge;
