"use client";

import { useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    Loader2, Plus, Trash2, Key, X, Shield, Mail,
    Search, Edit2, Copy, Filter, ChevronDown,
    MoreHorizontal, Clock,
    Users, Server, ArrowUpDown, Terminal, Check,
    ShieldCheck, ShieldAlert, Download, RefreshCw, LayoutGrid, List
} from "lucide-react";

// --- Types ---
export type UserRoleType = "CLIENT" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN";

export interface UserData {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: UserRoleType;
    status?: "active" | "suspended";
    suspended?: boolean;
    verified?: boolean;
    balance?: number;
    discordId?: string | null;
    lastLogin?: string | null;
    lastLoginIp?: string | null;
    createdAt?: string | null;
    twoFactorEnabled?: boolean;
    serversCount?: number;
    _count?: { servers: number };
}

interface UserActivity {
    id: string;
    userId: string;
    action: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    details?: string;
}

export default function UserManagement({ users: initialUsers }: { users: UserData[] }) {
    const router = useRouter();

    // --- State ---
    const [users, setUsers] = useState<UserData[]>(initialUsers);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | UserRoleType>("ALL");
    const [twoFactorFilter, setTwoFactorFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // --- Modals ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [resetUser, setResetUser] = useState<UserData | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
    const [activityUser, setActivityUser] = useState<UserData | null>(null);

    // --- Form States ---
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formRole, setFormRole] = useState<UserRoleType>("CLIENT");
    const [formBusy, setFormBusy] = useState(false);

    // --- Password Reset State ---
    const [resetPass, setResetPass] = useState("");
    const [resetBusy, setResetBusy] = useState(false);

    // --- Activity State ---
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // --- Delete State ---
    const [deleteBusy, setDeleteBusy] = useState(false);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 4000);
    };

    // --- Filtering ---
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const term = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !term ||
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.id.toLowerCase().includes(term) ||
                (user.lastLoginIp && user.lastLoginIp.toLowerCase().includes(term));

            const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

            const matches2FA =
                twoFactorFilter === "ALL" ||
                (twoFactorFilter === "ENABLED" && user.twoFactorEnabled) ||
                (twoFactorFilter === "DISABLED" && !user.twoFactorEnabled);

            return matchesSearch && matchesRole && matches2FA;
        });
    }, [users, searchTerm, roleFilter, twoFactorFilter]);

    // --- Stats ---
    const stats = useMemo(() => {
        const total = users.length;
        const clients = users.filter((u) => u.role === "CLIENT").length;
        const staff = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN" || u.role === "SUPPORT").length;
        const servers = users.reduce((acc, u) => acc + (u.serversCount || u._count?.servers || 0), 0);
        return { total, clients, staff, servers };
    }, [users]);

    // --- Helpers ---
    const copyToClipboard = (text: string, label = "Email") => {
        navigator.clipboard.writeText(text);
        setCopiedEmail(text);
        showToast(`${label} copied to clipboard!`, "success");
        setTimeout(() => setCopiedEmail(null), 2500);
    };

    const generateRandomPassword = () => {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*";
        let pwd = "";
        for (let i = 0; i < 16; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pwd;
    };

    const toggleSelectUser = (id: string) => {
        setSelectedUsers((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map((u) => u.id));
        }
    };

    const exportCsv = () => {
        const targets = selectedUsers.length > 0
            ? users.filter((u) => selectedUsers.includes(u.id))
            : filteredUsers;

        if (targets.length === 0) return;

        const headers = ["User ID", "Name", "Email", "Role", "Status", "Servers", "2FA Enabled", "Last Login", "Created At"];
        const rows = targets.map((u) => [
            `"${u.id}"`,
            `"${u.name.replace(/"/g, '""')}"`,
            `"${u.email}"`,
            `"${u.role}"`,
            `"${u.status || 'active'}"`,
            u.serversCount || u._count?.servers || 0,
            u.twoFactorEnabled ? "Yes" : "No",
            `"${u.lastLogin ? new Date(u.lastLogin).toISOString() : 'Never'}"`,
            `"${u.createdAt ? new Date(u.createdAt).toISOString() : 'Unknown'}"`,
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `vexanode-users-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${targets.length} users to CSV.`, "success");
    };

    const copySelectedEmails = () => {
        const targets = users.filter((u) => selectedUsers.includes(u.id));
        const emails = targets.map((u) => u.email).join(", ");
        copyToClipboard(emails, `${targets.length} emails`);
    };

    // --- Action Handlers ---
    const handleOpenAdd = () => {
        setEditingUser(null);
        setFormName("");
        setFormEmail("");
        setFormPassword(generateRandomPassword());
        setFormRole("CLIENT");
        setIsFormOpen(true);
    };

    const handleOpenEdit = (user: UserData) => {
        setEditingUser(user);
        setFormName(user.name);
        setFormEmail(user.email);
        setFormPassword("");
        setFormRole(user.role);
        setIsFormOpen(true);
        setActiveMenu(null);
    };

    const handleSubmitUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormBusy(true);
        try {
            if (editingUser) {
                await axios.put(`/api/admin/users/${editingUser.id}`, {
                    name: formName,
                    email: formEmail,
                    role: formRole,
                });
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === editingUser.id
                            ? { ...u, name: formName, email: formEmail, role: formRole }
                            : u
                    )
                );
                showToast("User details updated successfully.", "success");
            } else {
                const res = await axios.post("/api/admin/users", {
                    name: formName,
                    email: formEmail,
                    password: formPassword,
                    role: formRole,
                });
                const created = res.data?.user || res.data;
                const newUser: UserData = {
                    id: created.id || created._id,
                    name: formName,
                    email: formEmail,
                    role: formRole,
                    status: "active",
                    serversCount: 0,
                    _count: { servers: 0 },
                    createdAt: new Date().toISOString(),
                };
                setUsers((prev) => [newUser, ...prev]);
                showToast("New user account created successfully.", "success");
            }
            setIsFormOpen(false);
            router.refresh();
        } catch (error: any) {
            showToast(error.response?.data?.error || "Operation failed", "error");
        } finally {
            setFormBusy(false);
        }
    };

    const handleOpenReset = (user: UserData) => {
        setResetUser(user);
        setResetPass(generateRandomPassword());
        setActiveMenu(null);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetUser) return;
        setResetBusy(true);
        try {
            await axios.post(`/api/admin/users/${resetUser.id}/password`, { password: resetPass });
            showToast(`Password updated for ${resetUser.name}. Sessions invalidated.`, "success");
            setResetUser(null);
        } catch (error: any) {
            showToast(error.response?.data?.error || "Failed to reset password", "error");
        } finally {
            setResetBusy(false);
        }
    };

    const handleOpenActivity = async (user: UserData) => {
        setActivityUser(user);
        setLoadingActivities(true);
        setActiveMenu(null);
        try {
            const res = await axios.get(`/api/admin/users/${user.id}/activity`);
            setUserActivities(res.data?.activities || []);
        } catch {
            setUserActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        setDeleteBusy(true);
        try {
            await axios.delete(`/api/admin/users/${deleteUser.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
            setSelectedUsers((prev) => prev.filter((id) => id !== deleteUser.id));
            showToast(`User ${deleteUser.name} deleted successfully.`, "success");
            setDeleteUser(null);
            router.refresh();
        } catch (error: any) {
            showToast(error.response?.data?.error || "Failed to delete user", "error");
        } finally {
            setDeleteBusy(false);
        }
    };

    const formatRelativeTime = (iso?: string | null) => {
        if (!iso) return "Never";
        const date = new Date(iso);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 2) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };

    const getRoleBadge = (role: UserRoleType) => {
        switch (role) {
            case "SUPER_ADMIN":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        SUPER ADMIN
                    </span>
                );
            case "ADMIN":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        ADMIN
                    </span>
                );
            case "SUPPORT":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        SUPPORT
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                        CLIENT
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Feedback */}
            {feedback && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
                        feedback.type === "success"
                            ? "bg-[#11141a] text-emerald-400 border-emerald-500/30"
                            : "bg-[#11141a] text-red-400 border-red-500/30"
                    }`}
                >
                    {feedback.type === "success" ? <Check className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-[#e6e8ec]">User Accounts</h1>
                    <p className="text-xs text-[#8b93a1] mt-0.5">
                        Manage user authentication, permissions, assigned VPS instances, and credentials.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add User
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8b93a1]">Total Accounts</span>
                        <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-semibold text-[#e6e8ec] mt-2 font-mono">{stats.total}</p>
                </div>

                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8b93a1]">Clients</span>
                        <Users className="w-4 h-4 text-zinc-400" />
                    </div>
                    <p className="text-2xl font-semibold text-[#e6e8ec] mt-2 font-mono">{stats.clients}</p>
                </div>

                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8b93a1]">Staff & Admins</span>
                        <Shield className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-semibold text-[#e6e8ec] mt-2 font-mono">{stats.staff}</p>
                </div>

                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8b93a1]">Assigned Servers</span>
                        <Server className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-semibold text-[#e6e8ec] mt-2 font-mono">{stats.servers}</p>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b93a1]" />
                        <input
                            type="text"
                            placeholder="Search by name, email, ID, or IP…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e6e8ec] placeholder:text-[#8b93a1]/60 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b93a1] hover:text-[#e6e8ec]"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Role Filter */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="bg-[#0a0c10] border border-[#1f242d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6e8ec] focus:outline-none focus:border-blue-500/50"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="CLIENT">Clients</option>
                            <option value="SUPPORT">Support</option>
                            <option value="ADMIN">Admins</option>
                            <option value="SUPER_ADMIN">Super Admins</option>
                        </select>

                        {/* 2FA Filter */}
                        <select
                            value={twoFactorFilter}
                            onChange={(e) => setTwoFactorFilter(e.target.value as any)}
                            className="bg-[#0a0c10] border border-[#1f242d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6e8ec] focus:outline-none focus:border-blue-500/50"
                        >
                            <option value="ALL">All 2FA</option>
                            <option value="ENABLED">2FA Active</option>
                            <option value="DISABLED">2FA Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center border border-[#1f242d] rounded-lg bg-[#0a0c10] p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded text-xs transition-colors ${
                                viewMode === "table" ? "bg-[#181c24] text-white" : "text-[#8b93a1] hover:text-[#e6e8ec]"
                            }`}
                            title="Table View"
                        >
                            <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded text-xs transition-colors ${
                                viewMode === "grid" ? "bg-[#181c24] text-white" : "text-[#8b93a1] hover:text-[#e6e8ec]"
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={exportCsv}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0c10] border border-[#1f242d] rounded-lg text-xs text-[#8b93a1] hover:text-[#e6e8ec] transition-colors"
                        title="Export CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedUsers.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-300">
                    <span className="font-medium font-mono">
                        {selectedUsers.length} user{selectedUsers.length === 1 ? "" : "s"} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={copySelectedEmails}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-xs font-medium text-blue-200 transition-colors"
                        >
                            Copy Emails
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-xs font-medium text-blue-200 transition-colors"
                        >
                            Export Selected
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedUsers([])}
                            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1"
                        >
                            Deselect all
                        </button>
                    </div>
                </div>
            )}

            {/* Content: Table or Grid */}
            {filteredUsers.length === 0 ? (
                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg p-12 text-center">
                    <Users className="w-8 h-8 text-[#8b93a1]/50 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-[#e6e8ec]">No users found</h3>
                    <p className="text-xs text-[#8b93a1] mt-1">
                        Try adjusting your search query or clear the role filters.
                    </p>
                </div>
            ) : viewMode === "table" ? (
                <div className="bg-[#11141a] border border-[#1f242d] rounded-lg overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-[#1f242d] bg-[#0d1016] text-[#8b93a1]">
                                <th className="py-3 px-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                        onChange={selectAll}
                                        className="rounded border-[#1f242d] bg-[#0a0c10] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 px-4 font-medium">User</th>
                                <th className="py-3 px-4 font-medium">Role</th>
                                <th className="py-3 px-4 font-medium">Security</th>
                                <th className="py-3 px-4 font-medium">Servers</th>
                                <th className="py-3 px-4 font-medium">Last Login</th>
                                <th className="py-3 px-4 font-medium">Joined</th>
                                <th className="py-3 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f242d]">
                            {filteredUsers.map((user) => {
                                const isSelected = selectedUsers.includes(user.id);
                                const initials = (user.name || user.email)
                                    .slice(0, 2)
                                    .toUpperCase();

                                return (
                                    <tr
                                        key={user.id}
                                        className={`group transition-colors ${
                                            isSelected ? "bg-blue-500/5" : "hover:bg-[#141820]"
                                        }`}
                                    >
                                        <td className="py-3 px-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectUser(user.id)}
                                                className="rounded border-[#1f242d] bg-[#0a0c10] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[#181c24] border border-[#262c37] flex items-center justify-center font-mono text-[11px] font-semibold text-[#e6e8ec] shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-[#e6e8ec] truncate">
                                                        {user.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-[#8b93a1]">
                                                        <span className="truncate">{user.email}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(user.email)}
                                                            className="text-[#8b93a1] hover:text-[#e6e8ec] transition-colors"
                                                            title="Copy email"
                                                        >
                                                            {copiedEmail === user.email ? (
                                                                <Check className="w-3 h-3 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                                        <td className="py-3 px-4">
                                            {user.twoFactorEnabled ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400" title="2FA Active">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    <span>2FA On</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-[#8b93a1]/60" title="2FA Disabled">
                                                    <Shield className="w-3.5 h-3.5" />
                                                    <span>Off</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#e6e8ec] bg-[#181c24] px-2 py-0.5 rounded border border-[#262c37]">
                                                <Server className="w-3 h-3 text-[#8b93a1]" />
                                                {user.serversCount || user._count?.servers || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[11px] text-[#e6e8ec]">
                                                {formatRelativeTime(user.lastLogin)}
                                            </div>
                                            {user.lastLoginIp && (
                                                <div className="text-[10px] font-mono text-[#8b93a1]">
                                                    {user.lastLoginIp}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#8b93a1]">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="py-3 px-4 text-right relative">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(user)}
                                                    className="p-1.5 text-[#8b93a1] hover:text-[#e6e8ec] hover:bg-[#181c24] rounded transition-colors"
                                                    title="Edit user"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenReset(user)}
                                                    className="p-1.5 text-[#8b93a1] hover:text-amber-400 hover:bg-[#181c24] rounded transition-colors"
                                                    title="Reset password"
                                                >
                                                    <Key className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenActivity(user)}
                                                    className="p-1.5 text-[#8b93a1] hover:text-[#e6e8ec] hover:bg-[#181c24] rounded transition-colors"
                                                    title="Activity log"
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteUser(user)}
                                                    className="p-1.5 text-[#8b93a1] hover:text-red-400 hover:bg-[#181c24] rounded transition-colors"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredUsers.map((user) => {
                        const isSelected = selectedUsers.includes(user.id);
                        const initials = (user.name || user.email).slice(0, 2).toUpperCase();

                        return (
                            <div
                                key={user.id}
                                className={`bg-[#11141a] border rounded-lg p-4 transition-all relative ${
                                    isSelected
                                        ? "border-blue-500/50 bg-blue-500/[0.02]"
                                        : "border-[#1f242d] hover:border-[#2a313d]"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-lg bg-[#181c24] border border-[#262c37] flex items-center justify-center font-mono text-xs font-semibold text-[#e6e8ec]">
                                                {initials}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectUser(user.id)}
                                                className="absolute -top-1 -left-1 rounded border-[#1f242d] bg-[#0a0c10] text-blue-600 focus:ring-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-medium text-[#e6e8ec] truncate">
                                                {user.name}
                                            </h3>
                                            <p className="text-xs text-[#8b93a1] truncate font-mono">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    {getRoleBadge(user.role)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-[#0a0c10] border border-[#1f242d] rounded-lg text-[11px]">
                                    <div>
                                        <span className="text-[#8b93a1]">Servers</span>
                                        <p className="font-mono text-[#e6e8ec] mt-0.5">
                                            {user.serversCount || user._count?.servers || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[#8b93a1]">Last Login</span>
                                        <p className="font-mono text-[#e6e8ec] mt-0.5">
                                            {formatRelativeTime(user.lastLogin)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#1f242d] text-xs">
                                    <div className="text-[11px]">
                                        {user.twoFactorEnabled ? (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <ShieldCheck className="w-3.5 h-3.5" /> 2FA Active
                                            </span>
                                        ) : (
                                            <span className="text-[#8b93a1] flex items-center gap-1">
                                                <Shield className="w-3.5 h-3.5" /> 2FA Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(user)}
                                            className="p-1.5 text-[#8b93a1] hover:text-[#e6e8ec] hover:bg-[#181c24] rounded transition-colors"
                                            title="Edit user"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenReset(user)}
                                            className="p-1.5 text-[#8b93a1] hover:text-amber-400 hover:bg-[#181c24] rounded transition-colors"
                                            title="Reset password"
                                        >
                                            <Key className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenActivity(user)}
                                            className="p-1.5 text-[#8b93a1] hover:text-[#e6e8ec] hover:bg-[#181c24] rounded transition-colors"
                                            title="Activity log"
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteUser(user)}
                                            className="p-1.5 text-[#8b93a1] hover:text-red-400 hover:bg-[#181c24] rounded transition-colors"
                                            title="Delete user"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Modals --- */}

            {/* Create / Edit Modal */}
            {isFormOpen && (
                <Modal
                    title={editingUser ? "Edit User Account" : "Create New User"}
                    onClose={() => setIsFormOpen(false)}
                >
                    <form onSubmit={handleSubmitUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[#8b93a1] mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-lg px-3 py-2 text-xs text-[#e6e8ec] focus:outline-none focus:border-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#8b93a1] mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-lg px-3 py-2 text-xs text-[#e6e8ec] focus:outline-none focus:border-blue-500/50"
                            />
                        </div>

                        {!editingUser && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-medium text-[#8b93a1]">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setFormPassword(generateRandomPassword())}
                                        className="text-[11px] text-blue-400 hover:text-blue-300"
                                    >
                                        Generate Random
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder="Enter initial password"
                                    className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-lg px-3 py-2 text-xs text-[#e6e8ec] font-mono focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-[#8b93a1] mb-1.5">
                                Account Role
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["CLIENT", "SUPPORT", "ADMIN", "SUPER_ADMIN"] as UserRoleType[]).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setFormRole(r)}
                                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                                            formRole === r
                                                ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                                                : "bg-[#0a0c10] border-[#1f242d] text-[#8b93a1] hover:text-[#e6e8ec]"
                                        }`}
                                    >
                                        <div className="font-semibold">{r.replace("_", " ")}</div>
                                        <div className="text-[10px] text-[#8b93a1] mt-0.5">
                                            {r === "CLIENT"
                                                ? "Standard VPS access"
                                                : r === "SUPPORT"
                                                ? "Read & helper tools"
                                                : r === "ADMIN"
                                                ? "Server & user management"
                                                : "Unrestricted platform root"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-3 flex justify-end gap-2 border-t border-[#1f242d]">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-3.5 py-2 text-xs font-medium text-[#8b93a1] hover:text-[#e6e8ec] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={formBusy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                {formBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {editingUser ? "Save Changes" : "Create Account"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetUser && (
                <Modal
                    title="Reset User Password"
                    onClose={() => setResetUser(null)}
                >
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="p-3 bg-[#0a0c10] border border-[#1f242d] rounded-lg text-xs text-[#8b93a1]">
                            Resetting password for <strong className="text-[#e6e8ec]">{resetUser.name}</strong> ({resetUser.email}).
                            All active sessions on their devices will be invalidated immediately.
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-[#8b93a1]">
                                    New Password
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(resetPass, "Password")}
                                        className="text-[11px] text-[#8b93a1] hover:text-[#e6e8ec] flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" /> Copy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResetPass(generateRandomPassword())}
                                        className="text-[11px] text-blue-400 hover:text-blue-300"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                required
                                value={resetPass}
                                onChange={(e) => setResetPass(e.target.value)}
                                className="w-full bg-[#0a0c10] border border-[#1f242d] rounded-lg px-3 py-2 text-xs font-mono text-[#e6e8ec] focus:outline-none focus:border-blue-500/50"
                            />
                        </div>

                        <div className="pt-3 flex justify-end gap-2 border-t border-[#1f242d]">
                            <button
                                type="button"
                                onClick={() => setResetUser(null)}
                                className="px-3.5 py-2 text-xs font-medium text-[#8b93a1] hover:text-[#e6e8ec]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={resetBusy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                {resetBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Update Password
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Activity Modal */}
            {activityUser && (
                <Modal
                    title={`Activity Log · ${activityUser.name}`}
                    onClose={() => setActivityUser(null)}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#8b93a1] pb-2 border-b border-[#1f242d]">
                            <span>Recent Authentication Events</span>
                            <span className="font-mono">{userActivities.length} logs recorded</span>
                        </div>

                        {loadingActivities ? (
                            <div className="py-8 flex items-center justify-center text-xs text-[#8b93a1] gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Loading events…
                            </div>
                        ) : userActivities.length === 0 ? (
                            <div className="py-8 text-center text-xs text-[#8b93a1]">
                                No recent activity recorded for this account.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                {userActivities.map((act) => (
                                    <div
                                        key={act.id}
                                        className="p-2.5 bg-[#0a0c10] border border-[#1f242d] rounded-lg text-xs space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`font-semibold ${
                                                    act.action === "Login"
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                                }`}
                                            >
                                                {act.action}
                                            </span>
                                            <span className="font-mono text-[10px] text-[#8b93a1]">
                                                {new Date(act.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#8b93a1]">
                                            {act.ipAddress && <span>IP: <span className="font-mono text-[#e6e8ec]">{act.ipAddress}</span></span>}
                                            {act.details && <span className="text-red-400/80">{act.details}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteUser && (
                <Modal
                    title="Confirm Account Deletion"
                    onClose={() => setDeleteUser(null)}
                >
                    <div className="space-y-4">
                        <p className="text-xs text-[#8b93a1]">
                            Are you sure you want to permanently delete the account for{" "}
                            <strong className="text-[#e6e8ec]">{deleteUser.name}</strong> ({deleteUser.email})?
                        </p>

                        {(deleteUser.serversCount || deleteUser._count?.servers || 0) > 0 && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                                Warning: This user owns {deleteUser.serversCount || deleteUser._count?.servers} assigned server(s).
                                The system requires servers to be reassigned or deleted before this user account can be removed.
                            </div>
                        )}

                        <div className="pt-3 flex justify-end gap-2 border-t border-[#1f242d]">
                            <button
                                type="button"
                                onClick={() => setDeleteUser(null)}
                                className="px-3.5 py-2 text-xs font-medium text-[#8b93a1] hover:text-[#e6e8ec]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleteBusy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                {deleteBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Delete User
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// --- Reusable Modal Component ---
function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#11141a] w-full max-w-md rounded-xl border border-[#1f242d] shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex justify-between items-center px-5 py-4 border-b border-[#1f242d]">
                    <h3 className="text-sm font-semibold text-[#e6e8ec]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-[#8b93a1] hover:text-[#e6e8ec] p-1 hover:bg-[#181c24] rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
