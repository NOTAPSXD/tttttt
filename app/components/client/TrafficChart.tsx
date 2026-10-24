/**
 * TrafficChart — renders ONLY when meaningful network traffic data exists.
 *
 * Requirements:
 * - Returns null when totalGb === 0 and no samples exist.
 * - Y-axis labels include units (GB / MB).
 * - X-axis labels are unique (deduplicated).
 * - Custom tooltip on hover.
 * - Week / Month segmented control with 150ms transitions.
 * - Design tokens: surface #11141a, border #1f242d, radius 8px, text #e6e8ec, muted #8b93a1.
 */
"use client";

import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import { Panel, PanelHeader, PanelTitle } from "@/app/components/ui/primitives";
import { TrafficSummary, formatGib } from "@/lib/clientserver";

export interface TrafficSample {
    t: number;      // unix ms
    rxGb: number;
    txGb: number;
    totalGb: number;
}

interface TrafficChartProps {
    traffic: TrafficSummary;
    samples?: TrafficSample[];
}

type Period = "week" | "month";

interface Bucket {
    label: string;   // unique x-axis label
    inGb:  number;
    outGb: number;
}

const TOOLTIP_STYLE: React.CSSProperties = {
    background:    "#11141a",
    border:        "1px solid #1f242d",
    borderRadius:  "8px",
    fontSize:      "11px",
    color:         "#e6e8ec",
    padding:       "8px 12px",
    boxShadow:     "0 4px 20px rgba(0,0,0,0.5)",
};

/* Collapse samples into N time-buckets, using deltas between adjacent points */
function bucketize(samples: TrafficSample[], count: number): Bucket[] {
    if (samples.length < 2) return [];

    const usable = samples.slice(-count * 4);
    const size   = Math.max(1, Math.floor(usable.length / count));
    const result: Bucket[] = [];

    for (let i = 0; i < usable.length - 1; i += size) {
        const slice = usable.slice(i, i + size + 1);
        const first = slice[0];
        const last  = slice[slice.length - 1];

        // Format label: show date if period spans days, else time
        const d    = new Date(last.t);
        const span = last.t - usable[0].t;
        const label =
            span > 86_400_000
                ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

        result.push({
            label,
            inGb:  Math.max(0, +(last.rxGb - first.rxGb).toFixed(4)),
            outGb: Math.max(0, +(last.txGb - first.txGb).toFixed(4)),
        });
    }

    // Deduplicate labels (keep first occurrence)
    const seen = new Set<string>();
    return result
        .slice(-count)
        .map(b => {
            if (seen.has(b.label)) {
                return null;
            }
            seen.add(b.label);
            return b;
        })
        .filter((b): b is Bucket => b !== null);
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number | string;
        color?: string;
    }>;
    label?: string;
}

/* Custom tooltip adhering to token styling */
function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div style={TOOLTIP_STYLE}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b93a1]">
                {label}
            </p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-[11px] py-0.5">
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ background: p.color }}
                        aria-hidden="true"
                    />
                    <span className="text-[#8b93a1]">
                        {p.name === "inGb" ? "Inbound" : "Outbound"}
                    </span>
                    <span className="ml-auto font-mono font-semibold text-[#e6e8ec]">
                        {formatGib(Number(p.value ?? 0), 2)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function TrafficChart({ traffic, samples = [] }: TrafficChartProps) {
    const [period, setPeriod] = useState<Period>("week");

    const buckets = useMemo(
        () => bucketize(samples, period === "week" ? 7 : 30),
        [samples, period],
    );

    /* Don't render stat cards, chart or zero values if no traffic data exists */
    const hasData = traffic && (traffic.totalGb > 0 || buckets.length > 0);
    if (!hasData) return null;

    const freeGb =
        traffic.allowanceGb != null
            ? Math.max(0, traffic.allowanceGb - traffic.totalGb)
            : null;

    const usagePct = traffic.allowanceGb && traffic.allowanceGb > 0
        ? Math.min(100, (traffic.totalGb / traffic.allowanceGb) * 100)
        : null;

    const barColor = usagePct != null
        ? usagePct > 90 ? "#ef4444"
        : usagePct > 70 ? "#f59e0b"
        : "#22c55e"
        : "#3b82f6";

    return (
        <Panel flush>
            <PanelHeader>
                <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-[#8b93a1]" aria-hidden="true" />
                    <PanelTitle>Network Traffic</PanelTitle>
                </div>

                {/* Week / Month segmented control */}
                <div
                    className="flex items-center rounded-[6px] bg-[#0a0c10] p-0.5"
                    style={{ border: "1px solid #1f242d" }}
                    role="group"
                    aria-label="Traffic timeline range"
                >
                    {(["week", "month"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`rounded-[4px] px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none ${
                                period === p
                                    ? "bg-[#1f242d] text-[#e6e8ec]"
                                    : "text-[#8b93a1] hover:text-[#e6e8ec]"
                            }`}
                            aria-pressed={period === p}
                        >
                            {p === "week" ? "Week" : "Month"}
                        </button>
                    ))}
                </div>
            </PanelHeader>

            <div className="p-5 space-y-5">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: <ArrowDownToLine className="h-3.5 w-3.5" />, label: "Inbound",  value: traffic.rxGb,    color: "#3b82f6" },
                        { icon: <ArrowUpFromLine className="h-3.5 w-3.5" />, label: "Outbound", value: traffic.txGb,    color: "#f97316" },
                        { icon: <Activity        className="h-3.5 w-3.5" />, label: "Total",    value: traffic.totalGb, color: "#22c55e" },
                    ].map(({ icon, label, value, color }) => (
                        <div
                            key={label}
                            className="rounded-[8px] bg-[#0a0c10] p-3"
                            style={{ border: "1px solid #1f242d" }}
                        >
                            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b93a1] mb-1">
                                <span style={{ color }} aria-hidden="true">{icon}</span>
                                {label}
                            </p>
                            <p className="text-[14px] font-semibold font-mono text-[#e6e8ec]">
                                {formatGib(value)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Bar chart — only when bucketed time-series samples exist */}
                {buckets.length > 1 && (
                    <div className="h-40 w-full" aria-label="Network traffic bar chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={buckets}
                                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                                barGap={2}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1f242d"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: "#8b93a1", fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={{ stroke: "#1f242d" }}
                                />
                                <YAxis
                                    tick={{ fill: "#8b93a1", fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v: number) =>
                                        v === 0 ? "0"
                                        : v >= 1  ? `${v.toFixed(1)}GB`
                                        : `${(v * 1024).toFixed(0)}MB`
                                    }
                                    width={48}
                                />
                                <Tooltip
                                    content={<ChartTooltip />}
                                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                                />
                                <Bar dataKey="inGb"  name="inGb"  fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={14} />
                                <Bar dataKey="outGb" name="outGb" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Allowance bar */}
                {traffic.allowanceGb != null && usagePct != null && (
                    <div>
                        <div className="flex items-center justify-between text-[12px] mb-2">
                            <span className="text-[#8b93a1]">
                                {formatGib(traffic.totalGb)} of {formatGib(traffic.allowanceGb)} used
                            </span>
                            <span className="font-semibold text-[#e6e8ec] font-mono">
                                {usagePct.toFixed(1)}%
                            </span>
                        </div>
                        {/* Progress track */}
                        <div
                            className="h-1.5 w-full rounded-full bg-[#1f242d] overflow-hidden"
                            role="progressbar"
                            aria-valuenow={usagePct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${usagePct.toFixed(1)}% of cycle traffic allowance used`}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-150"
                                style={{ width: `${usagePct}%`, background: barColor }}
                            />
                        </div>
                        {freeGb != null && (
                            <p className="mt-1.5 text-[11px] text-[#8b93a1]">
                                {formatGib(freeGb)} remaining this billing cycle
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default TrafficChart;
