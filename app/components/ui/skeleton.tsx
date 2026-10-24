import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("rounded-[6px] bg-[#1a1f2a]/60 animate-pulse", className)}
            aria-hidden="true"
            {...props}
        />
    );
}

export function TextSkeleton({ className }: { className?: string }) {
    return <Skeleton className={cn("h-3.5 w-28", className)} />;
}

export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-[8px] bg-[#11141a] p-5 border border-[#1f242d] space-y-4",
                className
            )}
            aria-hidden="true"
        >
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
            </div>
            <div className="pt-2 flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-[6px]" />
                <Skeleton className="h-8 w-20 rounded-[6px]" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ cols = 4, className }: { cols?: number; className?: string }) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 py-3.5 px-4 border-b border-[#1f242d]",
                className
            )}
            aria-hidden="true"
        >
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === 0 ? "w-36" : i === 1 ? "w-24" : "w-16"
                    )}
                />
            ))}
        </div>
    );
}

export default Skeleton;
