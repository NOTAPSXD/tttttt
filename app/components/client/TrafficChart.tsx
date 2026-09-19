"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { ResourceBar } from "@/app/components/ui/progress";
import { cn } from "@/app/components/ui/button";
import { TrafficSummary, formatGib } from "@/lib/clientserver";

export interface TrafficSample {
    t: number;
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
    time: string;
    in: number;
    out: number;
}

const TOOLTIP_STYLE = {
    backgroundColor: "#0b0f17",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "10px",
    fontSize: "11px",
    color: "#e6eaf3",
} as const;

function bucketize(samples: TrafficSample[], count: number): Bucket[] {
    if (samples.length === 0) return [];
    const usable = samples.slice(-count * 2);
    if (usable.length <= 1) {
        return [
            {
                time: new Date(usable[0].t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
                in: usable[0].rxGb,
                out: usable[0].txGb,
            },
        ];
    }
    const size = Math.max(1, Math.ceil(usable.length / count));
    const buckets: Bucket[] = [];
    for (let i = 0; i < usable.length; i += size) {
        const slice = usable.slice(i, i + size);
        const first = slice[0];
        const last = slice[slice.length - 1];
        buckets.push({
            time: new Date(last.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
            in: Math.max(0, +(last.rxGb - first.rxGb).toFixed(3)),
            out: Math.max(0, +(last.txGb - first.txGb).toFixed(3)),
        });
    }
    return buckets.slice(-count);
}

export function TrafficChart({ traffic, samples = [] }: TrafficChartProps) {
    const [period, setPeriod] = useState<Period>("week");
    const buckets = useMemo(() => bucketize(samples, period === "week" ? 7 : 14), [samples, period]);
    const chartData = buckets.length > 0 ? buckets : [{ time: "IN", in: traffic.rxGb, out: traffic.txGb }];

    const freeGb = traffic.allowanceGb != null ? Math.max(0, traffic.allowanceGb - traffic.totalGb) : null;

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-info-blue" />
                        Traffic Consumption
                    </CardTitle>
                    <CardDescription>Network transfer for the current billing cycle</CardDescription>
                </div>
                <div className="flex rounded-lg border border-stroke bg-surface-2 p-0.5">
                    {(["week", "month"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                                period === p ? "bg-surface-3 text-panel-text" : "text-panel-faint hover:text-panel-muted",
                            )}
                        >
                            {p === "week" ? "Week" : "Month"}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent>
                {/* Totals row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-stroke bg-surface-2 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                            <ArrowDownToLine className="h-3 w-3 text-primary-blue" /> In
                        </p>
                        <p className="mt-1 text-lg font-bold text-panel-text">{formatGib(traffic.rxGb)}</p>
                    </div>
                    <div className="rounded-lg border border-stroke bg-surface-2 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                            <ArrowUpFromLine className="h-3 w-3 text-[#f97316]" /> Out
                        </p>
                        <p className="mt-1 text-lg font-bold text-panel-text">{formatGib(traffic.txGb)}</p>
                    </div>
                    <div className="rounded-lg border border-stroke bg-surface-2 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                            <Database className="h-3 w-3 text-success-green" /> Total
                        </p>
                        <p className="mt-1 text-lg font-bold text-panel-text">{formatGib(traffic.totalGb)}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="mt-4 h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 0, left: -18, bottom: 0 }} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tick={{ fill: "#565f73", fontSize: 10 }}
                                tickLine={false}
                                axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
                            />
                            <YAxis
                                tick={{ fill: "#565f73", fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: number) => (v >= 1 ? `${v}G` : `${v * 1024}M`)}
                            />
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                cursor={{ fill: "rgba(148,163,184,0.06)" }}
                                formatter={(value: any, name: any) => [
                                    `${formatGib(Number(value ?? 0), 3)}`,
                                    name === "in" ? "Inbound" : "Outbound",
                                ]}
                            />
                            <Bar dataKey="in" name="Inbound" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={14} />
                            <Bar dataKey="out" name="Outbound" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={14} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Allowance */}
                {traffic.allowanceGb != null && (
                    <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-panel-muted">
                                {formatGib(traffic.totalGb)} of {formatGib(traffic.allowanceGb)} used
                            </span>
                            <span className="font-semibold text-panel-text">{traffic.percentUsed.toFixed(1)}%</span>
                        </div>
                        <ResourceBar
                            value={traffic.percentUsed}
                            max={100}
                            color={traffic.percentUsed > 90 ? "red" : traffic.percentUsed > 70 ? "amber" : "green"}
                        />
                        {freeGb != null && (
                            <p className="mt-1.5 text-[11px] text-panel-muted">{formatGib(freeGb)} remaining in this cycle</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default TrafficChart;