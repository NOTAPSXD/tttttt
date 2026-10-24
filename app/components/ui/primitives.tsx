/**
 * Shared UI primitives: StatusDot, EmptyState, Panel, InlineErrorPanel
 * Design tokens:
 *   bg #0a0c10 · surface #11141a · border #1f242d · text #e6e8ec
 *   muted #8b93a1 · accent #3b82f6 · success #22c55e · danger #ef4444 · radius 8px
 */
import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ServerTone } from "@/lib/clientserver";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── StatusDot ────────────────────────────────────────────────────────────────
// Small colored indicator. Must always be accompanied by a visible or SR text label (never color alone).

const dotColor: Record<ServerTone, string> = {
    success: "bg-[#22c55e]",
    danger:  "bg-[#ef4444]",
    warning: "bg-[#f59e0b]",
    info:    "bg-[#3b82f6]",
    muted:   "bg-[#8b93a1]",
};

interface StatusDotProps {
    tone: ServerTone;
    /** Whether to add a subtle pulse ring (only for "live" states like RUNNING) */
    pulse?: boolean;
    className?: string;
    label?: string; // Optional accessible screen reader label if not paired with adjacent text
}

export function StatusDot({ tone, pulse = false, className, label }: StatusDotProps) {
    return (
        <span
            className={cn("relative inline-flex h-2 w-2 shrink-0 items-center justify-center", className)}
            aria-hidden={!label}
        >
            {label && <span className="sr-only">{label}</span>}
            {pulse && tone === "success" && (
                <span
                    className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-60 motion-reduce:hidden",
                        dotColor[tone],
                        "animate-ping"
                    )}
                    style={{ animationDuration: "2.5s" }}
                    aria-hidden="true"
                />
            )}
            <span
                className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor[tone])}
                aria-hidden="true"
            />
        </span>
    );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
// Focused empty state with icon, semibold title, one-line explanation, and primary CTA.

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
                className,
            )}
            style={{ border: "1px dashed #1f242d" }}
        >
            <div
                className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#0a0c10] text-[#8b93a1] transition-colors duration-150"
                style={{ border: "1px solid #1f242d" }}
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

// ── Panel ────────────────────────────────────────────────────────────────────
// Surface container adhering strictly to #11141a, #1f242d border, and 8px radius.

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Remove default padding (for full-bleed tables or segmented views) */
    flush?: boolean;
}

export function Panel({ flush = false, className, children, ...props }: PanelProps) {
    return (
        <div
            className={cn(
                "rounded-[8px] bg-[#11141a] transition-colors duration-150",
                !flush && "p-5",
                className,
            )}
            style={{ border: "1px solid #1f242d" }}
            {...props}
        >
            {children}
        </div>
    );
}

export function PanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex items-center justify-between gap-3 px-5 py-3.5", className)}
            style={{ borderBottom: "1px solid #1f242d" }}
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
                "flex items-center justify-between gap-3 rounded-[8px] bg-[#11141a] px-4 py-3 text-[13px]",
                className,
            )}
            style={{ border: "1px solid #1f242d" }}
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
