"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
    DollarSign, Calendar, FileText, User, ArrowLeft, 
    Check, CreditCard, Clock, Receipt, ChevronDown 
} from "lucide-react";
import Link from "next/link";

export default function CreateInvoicePage({ users }: { users: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        userId: "",
        amount: "",
        description: "",
        dueDate: ""
    });

    // Helper to find selected user name for preview
    const selectedUser = users.find(u => u.id === formData.userId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post("/api/invoices", formData);
            router.push("/invoices");
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-zinc-800">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/invoices"
                        className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">New Invoice</h1>
                        <p className="text-zinc-500 text-sm">Create and assign a payment request</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT: Form Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                
                                {/* User Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <User className="w-3 h-3" /> Client
                                    </label>
                                    <div className="relative group">
                                        <select
                                            required
                                            value={formData.userId}
                                            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-zinc-500 transition-colors"
                                        >
                                            <option value="">Select a client...</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-zinc-300" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Amount */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <DollarSign className="w-3 h-3" /> Amount
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full bg-black border border-zinc-800 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors font-mono placeholder:text-zinc-700"
                                            />
                                        </div>
                                    </div>

                                    {/* Due Date */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Due Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                required
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors font-mono appearance-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Description
                                    </label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Service details..."
                                        rows={4}
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors resize-none placeholder:text-zinc-700"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-4">
                                    <Link
                                        href="/invoices"
                                        className="px-6 py-2.5 rounded-lg text-sm font-bold text-zinc-500 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-white hover:bg-zinc-200 text-black px-8 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Clock className="w-4 h-4 animate-spin" />}
                                        {loading ? "Processing..." : "Issue Invoice"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT: Live Preview */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-4">
                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Preview</h3>
                            
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden relative">
                                {/* Top Decoration */}
                                <div className="h-1 w-full bg-zinc-800"></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                            <Receipt className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-500 uppercase font-bold">Status</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                                                Draft
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Billed To</p>
                                            <p className="text-white font-medium text-lg">
                                                {selectedUser ? selectedUser.name : <span className="text-zinc-700 italic">Select Client...</span>}
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                {selectedUser ? selectedUser.email : ""}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Due</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold text-white tracking-tight">
                                                        ${formData.amount || "0.00"}
                                                    </span>
                                                    <span className="text-sm text-zinc-500 font-medium">USD</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Due Date</p>
                                                <p className="text-sm font-mono text-zinc-300">
                                                    {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : "--/--/--"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs text-zinc-500 uppercase font-bold">Line Items</p>
                                            <div className="bg-black border border-zinc-800 rounded-lg p-3">
                                                <p className="text-sm text-zinc-300">
                                                    {formData.description || <span className="text-zinc-700 italic">No description provided...</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Bottom Decoration (Simulate Receipt Edge) */}
                                <div className="bg-zinc-900 p-4 border-t border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <CreditCard className="w-3 h-3" />
                                        <span>Payment pending</span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-600">ID: #DRAFT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}