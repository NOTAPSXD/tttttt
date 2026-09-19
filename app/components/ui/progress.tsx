import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { clampPercent } from "@/lib/clientserver";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type ProgressColor = "blue" | "green" | "red" | "amber" | "zinc";

const colorClasses: Record<ProgressColor, string> = {
    blue: "bg-primary-blue",
    green: "bg-success-green",
    red: "bg-danger-red",
    amber: "bg-warning-amber",
    zinc: "bg-panel-faint",
};

const trackClasses: Record<ProgressColor, string> = {
    blue: "bg-primary-blue/10",
    green: "bg-success-green/10",
    red: "bg-danger-red/10",
    amber: "bg-warning-amber/10",
    zinc: "bg-surface-3",
};

interface ResourceBarProps {
    value: number;
    max?: number;
    color?: ProgressColor;
    height?: "sm" | "md";
    className?: string;
}

export function ResourceBar({
    value,
    max = 100,
    color = "blue",
    height = "md",
    className,
}: ResourceBarProps) {
    const pct = max > 0 ? clampPercent((value / max) * 100) : 0;

    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn(
                "w-full overflow-hidden",
                trackClasses[color],
                height === "sm" ? "h-1.5" : "h-2",
                "rounded-full",
                className,
            )}
        >
            <div
                className={cn("h-full rounded-full transition-all duration-500", colorClasses[color])}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export default ResourceBar;