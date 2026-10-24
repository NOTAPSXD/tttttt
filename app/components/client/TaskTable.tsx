"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ClientTask, formatDuration, ServerTone, timeAgo } from "@/lib/clientserver";

interface TaskTableProps {
    tasks: ClientTask[];
    showServer?: boolean;
    limit?: number;
    title?: string;
    description?: string;
    emptyText?: string;
    collapsible?: boolean;
}

function taskTone(status: string): ServerTone {
    const s = status.toLowerCase();
    if (s.includes("complet") || s.includes("success") || s === "done" || s === "finished") return "success";
    if (s.includes("fail") || s.includes("error") || s.includes("cancel")) return "danger";
    if (s.includes("run") || s.includes("processing") || s.includes("in_progress")) return "info";
    if (s.includes("wait") || s.includes("pending") || s.includes("queued")) return "warning";
    return "muted";
}

export function TaskTable({
    tasks,
    showServer,
    limit = 8,
    title = "Tasks",
    description,
    emptyText = "No tasks yet. Power operations will appear here.",
    collapsible = true,
}: TaskTableProps) {
    const [expanded, setExpanded] = useState(false);
    const visibleTasks = useMemo(
        () => (expanded ? tasks : tasks.slice(0, limit)),
        [tasks, expanded, limit],
    );

    return (
        <Card>
            {(title || description) && (
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                </CardHeader>
            )}

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left">
                        <thead>
                            <tr className="border-b border-stroke text-[10px] font-bold uppercase tracking-wider text-panel-faint">
                                <th className="px-5 py-3">Task</th>
                                {showServer && <th className="px-5 py-3">Server</th>}
                                <th className="px-5 py-3">Requested</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {visibleTasks.length === 0 && (
                                <tr>
                                    <td colSpan={showServer ? 5 : 4} className="px-5 py-10 text-center">
                                        <Clock className="mx-auto mb-2 h-6 w-6 text-panel-faint" />
                                        <p className="text-sm text-panel-muted">{emptyText}</p>
                                    </td>
                                </tr>
                            )}
                            {visibleTasks.map((task) => (
                                <tr key={task.id} className="text-sm hover:bg-surface-2/50 transition-colors">
                                    <td className="px-5 py-3 font-medium text-panel-text">{task.type}</td>
                                    {showServer && (
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/client/servers/${task.serverId}`}
                                                className="text-primary-blue hover:text-info-blue hover:underline"
                                            >
                                                {task.serverName}
                                            </Link>
                                        </td>
                                    )}
                                    <td className="px-5 py-3 whitespace-nowrap text-xs text-panel-muted">
                                        {timeAgo(task.requestedAt)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge label={task.status} tone={taskTone(task.status)} />
                                    </td>
                                    <td className="px-5 py-3 text-right text-xs font-mono text-panel-muted">
                                        {formatDuration(task.durationSeconds)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {collapsible && tasks.length > limit && (
                    <div className="border-t border-stroke p-3">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded((v) => !v)}>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                            {expanded ? "Show less" : `Load more (${tasks.length - limit} more)`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default TaskTable;