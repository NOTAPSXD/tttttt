"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, ArrowRight, Server, CheckCircle } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await axios.post("/api/auth/register", {
                name,
                email,
                password
            });

            router.push("/login?registered=true");
        } catch (error: any) {
            setError(error.response?.data?.error || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#09090b]/60 border border-zinc-800/60 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-10 pb-4">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
                <p className="text-zinc-500 text-sm mt-2">Start managing your VPS infrastructure today</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6">
                {error && (
                    <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 animate-slide-up">
                        <p className="text-xs text-red-400 font-bold">{error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                            Full Name
                        </label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-400 transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black border border-zinc-800/80 rounded-xl pl-14 pr-5 py-4 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-400 transition-colors">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black border border-zinc-800/80 rounded-xl pl-14 pr-5 py-4 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                            Password
                        </label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-zinc-800/80 rounded-xl pl-14 pr-5 py-4 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            Must be at least 6 characters long
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-blue-600 text-white hover:bg-blue-500 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span>Creating Account...</span>
                        </>
                    ) : (
                        <>
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Footer */}
            <div className="px-10 pb-10">
                <div className="pt-6 border-t border-zinc-800/60 text-center">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Already have an account?{" "}
                        <Link href="/login" className="text-white hover:text-blue-400 transition-colors ml-1">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
