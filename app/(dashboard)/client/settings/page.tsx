"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import { Loader2, Lock, Shield, Key, Tag, Hash, ShieldCheck, QrCode, Copy, Check } from "lucide-react";
import QRCode from "qrcode";

export default function ClientSettingsPage() {
    const { data: session } = useSession();
    const user = session?.user;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            alert("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await axios.post("/api/user/change-password", {
                currentPassword,
                newPassword
            });
            alert("Password updated successfully. You will now be logged out. Please sign in with your new credentials.");
            signOut({ callbackUrl: "/login" });
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 p-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Account Settings
                </h1>
                <p className="text-zinc-400 mt-1">Manage your account profile, security, and preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Side: Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20 mb-4">
                                {user?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <h2 className="text-lg font-bold text-white tracking-tight">{user?.name || "Loading..."}</h2>
                            <p className="text-xs text-zinc-500 font-medium mt-1">{user?.email}</p>
                            
                            <div className="w-full mt-6 pt-6 border-t border-zinc-800/60 space-y-4 text-left">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" /> Role
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-blue-950/30 text-blue-400 border-blue-900/50">
                                        {user?.role || "CLIENT"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5" /> ID
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono font-bold select-all">
                                        {user?.id ? `${user.id.substring(0, 8)}...` : "Loading..."}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Security Forms */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-zinc-400" />
                            Change Password
                        </h2>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Current Password</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="password"
                                        className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium font-mono placeholder:text-zinc-800"
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">New Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="password"
                                            className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium font-mono placeholder:text-zinc-800"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="password"
                                            className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium font-mono placeholder:text-zinc-800"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <TwoFactorCard />
                </div>
            </div>
        </div>
    );
}

function TwoFactorCard() {
    const [enabled, setEnabled] = useState(false);
    const [checking, setChecking] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [secret, setSecret] = useState("");
    const [otpauthUrl, setOtpauthUrl] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [code, setCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        axios
            .get("/api/user/2fa/setup")
            .then((res) => setEnabled(res.data?.enabled === true))
            .catch(() => {})
            .finally(() => setChecking(false));
    }, []);

    const runSetup = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.post("/api/user/2fa/setup");
            setSecret(res.data.secret);
            setOtpauthUrl(res.data.otpauthUrl);
            setQrDataUrl(await QRCode.toDataURL(res.data.otpauthUrl));
        } catch (e: any) {
            setError(e.response?.data?.error || "Failed to start setup");
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.post("/api/user/2fa/enable", { code });
            setRecoveryCodes(res.data.recoveryCodes || []);
            setEnabled(true);
            setSecret("");
            setOtpauthUrl("");
            setQrDataUrl("");
            setCode("");
        } catch (e: any) {
            setError(e.response?.data?.error || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const disable = async () => {
        setLoading(true);
        setError("");
        try {
            await axios.post("/api/user/2fa/disable", { code });
            setEnabled(false);
            setRecoveryCodes(null);
            setCode("");
        } catch (e: any) {
            setError(e.response?.data?.error || "Failed to disable 2FA");
        } finally {
            setLoading(false);
        }
    };

    const copyCodes = () => {
        navigator.clipboard.writeText(recoveryCodes?.join("\n") || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="bg-[#09090b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Two-Factor Authentication
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
                Add a TOTP app (Google Authenticator, Authy, 1Password…) to your account.
            </p>

            {checking ? (
                <Loader2 className="animate-spin w-5 h-5 text-zinc-500" />
            ) : enabled ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-emerald-950/30 text-emerald-400 border-emerald-900/50">
                            Enabled
                        </span>
                    </div>

                    {!recoveryCodes && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                    Current Code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition-all font-mono placeholder:text-zinc-800"
                                    placeholder="••••••"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={disable}
                                disabled={loading || code.length < 6}
                                className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Disable 2FA"}
                            </button>
                        </div>
                    )}

                    {recoveryCodes && (
                        <div className="space-y-3">
                            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                                Save these recovery codes — they are shown only once.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {recoveryCodes.map((c) => (
                                    <code key={c} className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono text-center">
                                        {c}
                                    </code>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={copyCodes}
                                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied" : "Copy all"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecoveryCodes(null)}
                                className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            ) : recoveryCodes ? (
                <div className="space-y-3">
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                        Save these recovery codes — they are shown only once.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {recoveryCodes.map((c) => (
                            <code key={c} className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono text-center">
                                {c}
                            </code>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={copyCodes}
                        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied" : "Copy all"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecoveryCodes(null)}
                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold transition-all"
                    >
                        Done
                    </button>
                </div>
            ) : qrDataUrl ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-5 items-center">
                        <div className="bg-white p-3 rounded-xl shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrDataUrl} alt="2FA QR code" className="w-40 h-40" />
                        </div>
                        <div className="space-y-2 text-sm">
                            <p className="text-xs text-zinc-500">
                                Scan with your authenticator app, or enter the setup key manually:
                            </p>
                            <code className="block text-xs text-zinc-300 font-mono bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 break-all">
                                {secret}
                            </code>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                            Enter the 6-digit code from your app
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all font-mono text-center text-lg tracking-[0.5em] placeholder:text-zinc-800"
                            placeholder="••••••"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={verifyAndEnable}
                        disabled={loading || code.length < 6}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Verify & Enable"}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-zinc-500" />
                    <button
                        type="button"
                        onClick={runSetup}
                        disabled={loading}
                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Enable 2FA"}
                    </button>
                </div>
            )}

            {error && (
                <p className="mt-4 text-xs text-red-400 font-bold">{error}</p>
            )}
        </div>
    );
}
