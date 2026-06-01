"use client";

import { useState } from "react";
import axios from "axios";
import { Loader2, Lock, Shield, Key } from "lucide-react";

export default function ClientSettingsPage() {
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
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await axios.post("/api/user/change-password", {
                currentPassword,
                newPassword
            });
            alert("Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-400" />
                    Account Settings
                </h1>
                <p className="text-gray-400 mt-1">Manage your account security and preferences</p>
            </div>

            <div className="bg-[#0f1419] rounded-xl border border-white/10 p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    Change Password
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Current Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium"
                                placeholder="••••••••"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm New Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-medium"
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
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
