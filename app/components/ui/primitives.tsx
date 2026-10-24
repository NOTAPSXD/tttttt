/**
 * Shared UI primitives: StatusDot, EmptyState, Panel, InlineErrorPanel, Table, LoadingState
 * Design tokens:
 *   bg #0a0c10 · surface #11141a · border #1f242d · text #e6e8ec
 *   muted #8b93a1 · accent #3b82f6 · success #22c55e · danger #ef4444 · radius 8px
 */
import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import type { ServerTone } from "@/lib/clientserver";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── StatusDot ────────────────────────────────────────────────────────────────
// Small colored indicator with full accessibility.
const dotColor: Record<string, string> = {
    success:      "bg-[#22c55e]",
    danger:       "bg-[#ef4444]",
    warning:      "bg-[#f59e0b]",
    info:         "bg-[#3b82f6]",
    muted:        "bg-[#8b93a1]",
    online:       "bg-[#22c55e]",
    offline:      "bg-[#ef4444]",
    suspended:    "bg-[#f59e0b]",
    provisioning: "bg-[#3b82f6]",
};

interface StatusDotProps {
    tone: ServerTone | "online" | "offline" | "suspended" | "provisioning";
    /** Whether to add a subtle pulse ring (only for "live" states like Online) */
    pulse?: boolean;
    className?: string;
    label?: string; // Optional accessible screen reader label if not paired with adjacent text
}

export function StatusDot({ tone, pulse = false, className, label }: StatusDotProps) {
    const isLive = pulse && (tone === "success" || tone === "online");
    const color = dotColor[tone] || dotColor.muted;

    return (
        <span
            className={cn("relative inline-flex h-2 w-2 shrink-0 items-center justify-center", className)}
            aria-hidden={!label}
        >
            {label && <span className="sr-only">{label}</span>}
            {isLive && (
                <span
                    className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-60 motion-reduce:hidden",
                        color,
                        "animate-ping"
                    )}
                    style={{ animationDuration: "2.5s" }}
                    aria-hidden="true"
                />
            )}
            <span
                className={cn("relative inline-flex h-2 w-2 rounded-full", color)}
                aria-hidden="true"
            />
        </span>
    );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
// Clean empty state with icon, semibold title, description, and primary CTA.
interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3.5 rounded-[8px] bg-[#11141a] p-8 md:p-12 text-center",
                "border border-dashed border-[#1f242d]",
                className,
            )}
        >
            <div
                className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#0a0c10] text-[#8b93a1] border border-[#1f242d] transition-colors"
                aria-hidden="true"
            >
                {icon}
            </div>
            <div className="space-y-1 max-w-sm">
                <h3 className="text-[15px] font-semibold tracking-tight text-[#e6e8ec]">
                    {title}
                </h3>
                {description && (
                    <p className="text-[13px] leading-relaxed text-[#8b93a1]">
                        {description}
                    </p>
                )}
            </div>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

// ── LoadingState ─────────────────────────────────────────────────────────────
// Centered inline loading block with spinner and readable status message.
interface LoadingStateProps {
    message?: string;
    className?: string;
}

export function LoadingState({ message = "Loading data...", className }: LoadingStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-[8px] bg-[#11141a] p-10 text-center border border-[#1f242d]",
                className
            )}
            role="status"
            aria-live="polite"
        >
            <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" aria-hidden="true" />
            <p className="text-[13px] font-medium text-[#8b93a1]">{message}</p>
        </div>
    );
}

// ── Panel ────────────────────────────────────────────────────────────────────
// Surface container adhering strictly to #11141a, #1f242d border, and 8px radius.
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    flush?: boolean;
}

export function Panel({ flush = false, className, children, ...props }: PanelProps) {
    return (
        <div
            className={cn(
                "rounded-[8px] bg-[#11141a] border border-[#1f242d] transition-colors duration-150",
                !flush && "p-5",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function PanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#1f242d]", className)}
            {...props}
        />
    );
}

export function PanelTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("text-[13px] font-semibold text-[#e6e8ec] tracking-tight", className)}
            {...props}
        />
    );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-5", className)} {...props} />;
}

// ── InlineErrorPanel ─────────────────────────────────────────────────────────
// Inline retry state per panel instead of crashing or full-page blank errors.
interface InlineErrorPanelProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function InlineErrorPanel({
    message = "Unable to load data at this time.",
    onRetry,
    className,
}: InlineErrorPanelProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 rounded-[8px] bg-[#11141a] px-4 py-3 text-[13px] border border-[#1f242d]",
                className,
            )}
            role="alert"
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#ef4444]" aria-hidden="true" />
                <span className="text-[#8b93a1] truncate">{message}</span>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 shrink-0 rounded-[6px] px-2.5 py-1 text-[12px] font-semibold text-[#e6e8ec] hover:text-white bg-[#1f242d] hover:bg-[#2c3448] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[32px]"
                >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Retry
                </button>
            )}
        </div>
    );
}
