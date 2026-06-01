"use client";

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ResourceChartProps {
    data: Array<{ time: string; cpu: number; ram: number }>;
    type: "cpu" | "ram";
}

export default function ResourceChart({ data, type }: ResourceChartProps) {
    const isCPU = type === "cpu";
    const currentValue = data[data.length - 1]?.[type] || 0;
    const previousValue = data[data.length - 2]?.[type] || 0;
    const trend = currentValue > previousValue;

    return (
        <div className="bg-white/5 backdrop-blur-xl p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider">
                        {isCPU ? "CPU Usage" : "RAM Usage"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl md:text-3xl font-bold text-white">
                            {currentValue.toFixed(1)}%
                        </span>
                        <div className={`flex items-center gap-1 text-xs font-semibold ${trend ? "text-red-400" : "text-emerald-400"
                            }`}>
                            {trend ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            {Math.abs(currentValue - previousValue).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-32 md:h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={isCPU ? "#3b82f6" : "#8b5cf6"}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={isCPU ? "#3b82f6" : "#8b5cf6"}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            dataKey="time"
                            stroke="#71717a"
                            fontSize={10}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#71717a"
                            fontSize={10}
                            tickLine={false}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#09090b",
                                border: "1px solid #27272a",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                            labelStyle={{ color: "#a1a1aa" }}
                        />
                        <Area
                            type="monotone"
                            dataKey={type}
                            stroke={isCPU ? "#3b82f6" : "#8b5cf6"}
                            strokeWidth={2}
                            fill={`url(#gradient-${type})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
