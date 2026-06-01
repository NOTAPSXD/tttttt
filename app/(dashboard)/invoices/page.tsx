import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Invoice } from "@/lib/db";
import Link from "next/link";
import { DollarSign, Calendar, CheckCircle, XCircle, Clock, Plus } from "lucide-react";

export default async function InvoicesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return null;
    }

    await connectDB();

    let rawInvoices;
    if (session.user.role === 'ADMIN') {
        rawInvoices = await Invoice.find().sort({ createdAt: -1 }).populate('userId').lean();
    } else {
        rawInvoices = await Invoice.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    }

    const invoices = rawInvoices.map((inv: any) => ({
        ...inv,
        id: inv._id.toString(),
        // Map populated userId to user for compatibility, or keep as userId if component expects it.
        // Original code accessed (invoice as any).user?.name
        user: inv.userId || null
    }));

    const stats = {
        total: invoices.length,
        paid: invoices.filter((i: any) => i.status === 'PAID').length,
        unpaid: invoices.filter((i: any) => i.status === 'UNPAID').length,
        totalAmount: invoices.reduce((sum: number, i: any) => sum + i.amount, 0),
        paidAmount: invoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.amount, 0)
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Invoices</h2>
                    <p className="text-gray-400">Manage billing and payments</p>
                </div>
                {session.user.role === 'ADMIN' && (
                    <Link
                        href="/admin/invoices/create"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Invoice
                    </Link>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <DollarSign className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-white">${stats.totalAmount.toFixed(2)}</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Paid</p>
                    <p className="text-3xl font-bold text-white">${stats.paidAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.paid} invoices</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <Clock className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Unpaid</p>
                    <p className="text-3xl font-bold text-white">${(stats.totalAmount - stats.paidAmount).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.unpaid} invoices</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <Calendar className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Total Invoices</p>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
            </div>

            {/* Invoice List */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice #</th>
                                {session.user.role === 'ADMIN' && <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>}
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {invoices.map((invoice: any) => (
                                <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-mono text-sm text-gray-300">#{invoice.id.slice(0, 8)}</span>
                                    </td>
                                    {session.user.role === 'ADMIN' && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-white">{(invoice as any).user?.name}</span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-white">{invoice.description}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-bold text-white">${invoice.amount.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-400">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${invoice.status === 'PAID'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {invoice.status === 'UNPAID' && (
                                            <Link
                                                href={`/invoices/${invoice.id}/pay`}
                                                className="text-blue-400 hover:text-blue-300 text-sm font-bold"
                                            >
                                                Pay Now
                                            </Link>
                                        )}
                                        {invoice.status === 'PAID' && (
                                            <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" /> Paid
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
