"use client";

import { useState } from "react";
import axios from "axios";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('LOADING');
        try {
            await axios.post("/api/auth/forgot-password", { email });
            // Always show success to prevent enumeration
            setStatus('SUCCESS');
        } catch (e) {
            // Even if error, maybe show success or generic error
            setStatus('SUCCESS');
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f1419] rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                            <Mail className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
                        <p className="text-gray-400 text-sm">Enter your email address and we'll send you a recovery link.</p>
                    </div>

                    {status === 'SUCCESS' ? (
                        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center">
                                <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                                <p className="text-emerald-400 font-bold mb-1">Check your inbox</p>
                                <p className="text-xs text-emerald-200/70">If an account exists for {email}, we've sent instructions.</p>
                            </div>
                            <Link href="/login" className="block w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all border border-white/10">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-gray-600"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={status === 'LOADING'}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'LOADING' ? <Loader2 className="animate-spin w-5 h-5" /> : "Send Reset Link"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
