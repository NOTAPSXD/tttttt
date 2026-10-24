import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("rounded-lg shimmer", className)}
            {...props}
        />
    );
}

export function TextSkeleton({ className }: { className?: string }) {
    return <Skeleton className={cn("h-3 w-28", className)} />;
}

export default Skeleton;
