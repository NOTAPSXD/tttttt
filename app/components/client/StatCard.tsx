import { Card, cn } from "@/app/components/ui/card";
import { ServerTone } from "@/lib/clientserver";

interface StatCardProps {
    label: string;
    value: string;
    unit?: string;
    sub?: string;
    icon?: React.ReactNode;
    tone?: ServerTone;
}

const toneBar: Record<ServerTone, string> = {
    success: "bg-success-green",
    danger: "bg-danger-red",
    warning: "bg-warning-amber",
    info: "bg-primary-blue",
    muted: "bg-panel-faint",
};

const toneIcon: Record<ServerTone, string> = {
    success: "text-success-green bg-success-soft",
    danger: "text-danger-red bg-danger-soft",
    warning: "text-warning-amber bg-warning-soft",
    info: "text-info-blue bg-primary-blue-soft",
    muted: "text-panel-muted bg-surface-3",
};

export function StatCard({ label, value, unit, sub, icon, tone = "info" }: StatCardProps) {
    return (
        <Card className="relative overflow-hidden p-5">
            <div className={cn("absolute top-0 left-0 h-0.5 w-full opacity-60", toneBar[tone])} />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-panel-muted">{label}</p>
                    <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-panel-text leading-none">{value}</span>
                        {unit && <span className="text-xs font-semibold text-panel-faint">{unit}</span>}
                    </div>
                    {sub && <p className="mt-2 text-xs text-panel-muted">{sub}</p>}
                </div>
                {icon && (
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneIcon[tone])}>
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}

export default StatCard;