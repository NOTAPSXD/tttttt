import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ServerTone } from "@/lib/clientserver";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const toneClasses: Record<ServerTone, string> = {
    success: "bg-success-soft text-success-green border-success-green/25",
    danger: "bg-danger-soft text-danger-red border-danger-red/25",
    warning: "bg-warning-soft text-warning-amber border-warning-amber/25",
    info: "bg-primary-blue-soft text-info-blue border-primary-blue/25",
    muted: "bg-surface-3 text-panel-muted border-stroke",
};

const dotClasses: Record<ServerTone, string> = {
    success: "bg-success-green",
    danger: "bg-danger-red",
    warning: "bg-warning-amber",
    info: "bg-info-blue",
    muted: "bg-panel-faint",
};

export function Badge({
    className,
    children,
}: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                toneClasses.muted,
                className,
            )}
        >
            {children}
        </span>
    );
}

export function StatusBadge({
    label,
    tone = "muted",
    pulse = true,
    className,
}: {
    label: string;
    tone?: ServerTone;
    pulse?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                toneClasses[tone],
                className,
            )}
        >
            <span className={cn("w-1.5 h-1.5 rounded-full", dotClasses[tone], pulse && "animate-pulse")} />
            {label}
        </span>
    );
}

export default StatusBadge;