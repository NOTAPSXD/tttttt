import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("animate-pulse rounded-lg bg-surface-3/70", className)} {...props} />;
}

export function TextSkeleton({ className }: { className?: string }) {
    return <Skeleton className={cn("h-3.5 w-28", className)} />;
}

export default Skeleton;