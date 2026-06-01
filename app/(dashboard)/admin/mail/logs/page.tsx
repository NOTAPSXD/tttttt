import { connectDB, EmailLog } from "@/lib/db";
import {
    Mail, CheckCircle2, XCircle, Clock,
    Search, Filter, ArrowUpRight, MoreHorizontal,
    Inbox, Send
} from "lucide-react";

export default async function EmailLogsPage() {
    let logs: any[] = [];
    let stats = {
        total: 0,
        success: 0,
        failed: 0
    };

    try {
        await connectDB();
        const rawLogs = await EmailLog.find().sort({ createdAt: -1 }).limit(100).lean();
        logs = rawLogs.map((l: any) => ({ ...l, id: l._id.toString() }));

        stats.total = logs.length;
        stats.success = logs.filter((l: any) => l.status === 'SENT').length;
        stats.failed = logs.filter((l: any) => l.status !== 'SENT').length;
    } catch (e) {
        console.error("Failed to fetch logs", e);
    }

    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-zinc-800">
            <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8 space-y-8">

                {/* 1. Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Mail className="w-6 h-6 text-white" />
                            Transmission Logs
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">Audit trail of all system and manual email dispatch events.</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                            <p className="text-[10px] uppercase font-bold text-zinc-500">Total Sent</p>
                            <p className="text-xl font-mono font-bold text-white">{stats.total}</p>
                        </div>
                        <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                            <p className="text-[10px] uppercase font-bold text-zinc-500">Success Rate</p>
                            <p className="text-xl font-mono font-bold text-emerald-500">
                                {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(0) : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Toolbar (Visual Only for Server Component) */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search recipients or subjects..."
                            className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 font-mono"
                            disabled
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                            <Filter className="w-3.5 h-3.5" /> Filter
                        </button>
                        <button className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Export
                        </button>
                    </div>
                </div>

                {/* 3. Data Table */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#09090b]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/30 border-b border-zinc-800">
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recipient</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dispatcher</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Inbox className="w-8 h-8 text-zinc-700 mb-3" />
                                                <p className="text-zinc-500 text-sm">No email logs found in the system.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.map((log: any) => (
                                    <tr key={log.id} className="group hover:bg-zinc-900/40 transition-colors">

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.status === 'SENT' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-500 text-[10px] font-bold uppercase tracking-wide">
                                                    <CheckCircle2 className="w-3 h-3" /> Delivered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-red-900/50 bg-red-950/30 text-red-500 text-[10px] font-bold uppercase tracking-wide">
                                                    <XCircle className="w-3 h-3" /> Failed
                                                </span>
                                            )}
                                        </td>

                                        {/* Timestamp */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                                <span className="text-xs font-mono">
                                                    {new Date(log.createdAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Recipient */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-mono text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                                {log.recipient}
                                            </span>
                                        </td>

                                        {/* Subject */}
                                        <td className="px-6 py-4 max-w-md">
                                            <div className="truncate text-sm text-zinc-300 font-medium" title={log.subject}>
                                                {log.subject}
                                            </div>
                                        </td>

                                        {/* Sent By */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                                    {log.sentBy === 'SYSTEM' ? (
                                                        <Send className="w-2.5 h-2.5 text-blue-400" />
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-zinc-400">U</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-zinc-400 font-medium">{log.sentBy || 'SYSTEM'}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-zinc-600 hover:text-white transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Pagination Placeholder */}
                    <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
                        <p className="text-xs text-zinc-500">Showing last {logs.length} transactions</p>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 rounded border border-zinc-800 bg-black text-[10px] font-bold text-zinc-500 hover:text-white disabled:opacity-50" disabled>Previous</button>
                            <button className="px-3 py-1 rounded border border-zinc-800 bg-black text-[10px] font-bold text-zinc-500 hover:text-white disabled:opacity-50" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}