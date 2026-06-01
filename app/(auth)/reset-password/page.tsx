"use client";

import { useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Key, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

function ResetForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMsg, setErrorMsg] = useState("");

    if (!token) {
        return (
            <div className="text-center py-8">
                <p className="text-red-400 font-bold mb-4">Invalid or missing reset token.</p>
                <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">Request a new link</Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('ERROR');
            setErrorMsg("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setStatus('ERROR');
            setErrorMsg("Password must be at least 6 characters");
            return;
        }

        setStatus('LOADING');
        try {
            await axios.post("/api/auth/reset-password", { token, password });
            setStatus('SUCCESS');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (e: any) {
            setStatus('ERROR');
            setErrorMsg(e.response?.data?.error || "Failed to reset password");
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
                    <p className="text-emerald-200/70 text-sm">Your password has been successfully updated.</p>
                </div>
                <p className="text-gray-500 text-sm">Redirecting to login in 3 seconds...</p>
                <Link href="/login" className="block w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all">
                    Login Now
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'ERROR' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm text-center">
                    {errorMsg}
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">New Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="password"
                        required
                        className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-gray-600"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Confirm Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="password"
                        required
                        className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-gray-600"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={status === 'LOADING'}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {status === 'LOADING' ? <Loader2 className="animate-spin w-5 h-5" /> : "Set New Password"}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f1419] rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                            <Key className="w-8 h-8 text-purple-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                        <p className="text-gray-400 text-sm">Create a strong password for your account.</p>
                    </div>

                    <Suspense fallback={<div className="text-center text-white">Loading...</div>}>
                        <ResetForm />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
