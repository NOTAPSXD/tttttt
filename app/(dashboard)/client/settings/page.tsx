"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import {
    Loader2,
    Lock,
    Shield,
    Key,
    Tag,
    Hash,
    ShieldCheck,
    QrCode,
    Copy,
    Check,
    CreditCard,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/components/ui/dialog";

export default function ClientSettingsPage() {
    const { data: session } = useSession();
    const user = session?.user;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (newPassword !== confirmPassword) {
            setErrorMsg("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setErrorMsg("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            await axios.post("/api/user/change-password", {
                currentPassword,
                newPassword,
            });
            setSuccessMsg("Password updated successfully. Logging out...");
            toast.success("Password updated successfully");
            setTimeout(() => {
                signOut({ callbackUrl: "/login" });
            }, 1500);
        } catch (error: any) {
            setErrorMsg(error.response?.data?.error || "Failed to update password");
            toast.error("Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 pb-24 md:pb-12">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#e6e8ec] tracking-tight flex items-center gap-3">
                    <Shield className="w-7 h-7 text-[#3b82f6]" aria-hidden="true" />
                    Account Settings
                </h1>
                <p className="text-[13px] text-[#8b93a1] mt-1">
                    Manage your account security, credentials, and authentication preferences.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Side: Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-[#11141a] border border-[#1f242d] rounded-[8px] p-6 shadow-sm">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#1a1f2a] border border-[#1f242d] rounded-full flex items-center justify-center text-[#e6e8ec] text-2xl font-bold mb-3">
                                {user?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <h2 className="text-base font-semibold text-[#e6e8ec] tracking-tight">
                                {user?.name || "Client"}
                            </h2>
                            <p className="text-[12px] text-[#8b93a1] mt-0.5">{user?.email}</p>

                            <div className="w-full mt-6 pt-5 border-t border-[#1f242d] space-y-3 text-left">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-[#8b93a1] font-medium flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Role
                                    </span>
                                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {user?.role || "CLIENT"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-[#8b93a1] font-medium flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5" aria-hidden="true" /> User ID
                                    </span>
                                    <span className="text-[#8b93a1] font-mono text-[11px] select-all">
                                        {user?.id ? `${user.id.substring(0, 10)}…` : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing placeholder per backend verification rule */}
                    <div className="bg-[#11141a] border border-[#1f242d] rounded-[8px] p-5">
                        <div className="flex items-center gap-2 mb-2 text-[#e6e8ec] font-semibold text-[14px]">
                            <CreditCard className="w-4 h-4 text-[#3b82f6]" aria-hidden="true" />
                            <h3>Billing & Invoices</h3>
                        </div>
                        <p className="text-[12px] text-[#8b93a1] leading-relaxed">
                            Automated invoice generation and payment gateway methods are currently managed via support.
                        </p>
                        <div className="mt-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1a1f2a] text-[#8b93a1] border border-[#1f242d]">
                                Backend integration pending
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Security & Credentials */}
                <div className="md:col-span-2 space-y-6">
                    {/* Password Change Card */}
                    <div className="bg-[#11141a] border border-[#1f242d] rounded-[8px] p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-[#e6e8ec] mb-1 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#8b93a1]" aria-hidden="true" />
                            Change Password
                        </h2>
                        <p className="text-[12px] text-[#8b93a1] mb-5">
                            Update your credentials. You will be signed out of active web sessions upon saving.
                        </p>

                        {errorMsg && (
                            <div className="mb-4 rounded-[6px] bg-red-500/10 border border-red-500/30 p-3 text-[12px] text-red-400 flex items-center gap-2" role="alert">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="mb-4 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 p-3 text-[12px] text-emerald-400 flex items-center gap-2" role="status">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="current-password-input"
                                    className="block text-[11px] font-semibold uppercase tracking-wider text-[#8b93a1] mb-1.5"
                                >
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b93a1]" aria-hidden="true" />
                                    <input
                                        id="current-password-input"
                                        type="password"
                                        className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-[8px] pl-10 pr-3 py-2 text-[13px] text-[#e6e8ec] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors"
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="new-password-input"
                                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#8b93a1] mb-1.5"
                                    >
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b93a1]" aria-hidden="true" />
                                        <input
                                            id="new-password-input"
                                            type="password"
                                            className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-[8px] pl-10 pr-3 py-2 text-[13px] text-[#e6e8ec] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label
                                        htmlFor="confirm-password-input"
                                        className="block text-[11px] font-semibold uppercase tracking-wider text-[#8b93a1] mb-1.5"
                                    >
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b93a1]" aria-hidden="true" />
                                        <input
                                            id="confirm-password-input"
                                            type="password"
                                            className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-[8px] pl-10 pr-3 py-2 text-[13px] text-[#e6e8ec] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] disabled:opacity-50 flex items-center gap-2 min-h-[38px]"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Two Factor Card */}
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
            toast.success("Two-Factor Authentication enabled");
        } catch (e: any) {
            setError(e.response?.data?.error || "Verification failed");
            toast.error("Verification failed");
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
            toast.success("Two-Factor Authentication disabled");
        } catch (e: any) {
            setError(e.response?.data?.error || "Failed to disable 2FA");
            toast.error("Failed to disable 2FA");
        } finally {
            setLoading(false);
        }
    };

    const copyCodes = () => {
        navigator.clipboard.writeText(recoveryCodes?.join("\n") || "");
        setCopied(true);
        toast.success("Recovery codes copied");
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="bg-[#11141a] border border-[#1f242d] rounded-[8px] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#e6e8ec] mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                Two-Factor Authentication
            </h2>
            <p className="text-[12px] text-[#8b93a1] mb-5">
                Add an extra layer of defense using standard TOTP authentication applications.
            </p>

            {checking ? (
                <div className="flex items-center gap-2 text-[12px] text-[#8b93a1]">
                    <Loader2 className="animate-spin w-4 h-4 text-[#3b82f6]" />
                    <span>Checking authentication status…</span>
                </div>
            ) : enabled ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-[13px] font-semibold">
                        <Check className="w-4 h-4" />
                        <span>Two-factor authentication is active</span>
                    </div>

                    {recoveryCodes && (
                        <div className="bg-[#0a0c10] border border-[#1f242d] rounded-[8px] p-4 space-y-3">
                            <p className="text-[12px] text-[#e6e8ec] font-semibold">
                                Store your emergency recovery codes in a safe vault:
                            </p>
                            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-[#8b93a1]">
                                {recoveryCodes.map((rc, i) => (
                                    <div key={i} className="p-1.5 bg-[#141820] rounded text-center">
                                        {rc}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={copyCodes}
                                className="text-[12px] font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors flex items-center gap-1.5"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copied ? "Copied" : "Copy codes"}</span>
                            </button>
                        </div>
                    )}

                    <div className="pt-2 border-t border-[#1f242d] flex flex-col sm:flex-row sm:items-center gap-3">
                        <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-44 bg-[#0a0c10] border border-[#1f242d] rounded-[8px] px-3 py-1.5 text-[13px] text-[#e6e8ec] font-mono outline-none focus:border-[#3b82f6]"
                            maxLength={6}
                        />
                        <button
                            type="button"
                            onClick={disable}
                            disabled={loading || code.length !== 6}
                            className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors disabled:opacity-50"
                        >
                            Disable 2FA
                        </button>
                    </div>
                </div>
            ) : secret && qrDataUrl ? (
                <div className="space-y-4">
                    <p className="text-[12px] text-[#8b93a1]">
                        Scan this QR code with your authenticator app, then enter the 6-digit confirmation code below:
                    </p>
                    <div className="flex justify-center p-3 bg-white rounded-[8px] w-fit">
                        <img src={qrDataUrl} alt="2FA QR Code" className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#8b93a1]">Key:</span>
                        <code className="text-[11px] font-mono text-[#e6e8ec] bg-[#0a0c10] px-2 py-0.5 rounded border border-[#1f242d] select-all">
                            {secret}
                        </code>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="text"
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-36 bg-[#0a0c10] border border-[#1f242d] rounded-[8px] px-3 py-1.5 text-[13px] text-[#e6e8ec] font-mono text-center tracking-widest outline-none focus:border-[#3b82f6]"
                            maxLength={6}
                        />
                        <button
                            type="button"
                            onClick={verifyAndEnable}
                            disabled={loading || code.length !== 6}
                            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors disabled:opacity-50"
                        >
                            Verify & Activate
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={runSetup}
                        disabled={loading}
                        className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors flex items-center gap-2 min-h-[38px] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                        <span>Set Up Two-Factor</span>
                    </button>
                </div>
            )}

            {error && <p className="mt-3 text-[12px] text-red-400 font-medium">{error}</p>}
        </div>
    );
}
