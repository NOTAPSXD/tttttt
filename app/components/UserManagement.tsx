"use client";

import { useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    Loader2, Plus, Trash2, Key, X, User, Shield, Mail,
    Search, Edit2, Copy, Filter, ChevronDown, 
    MoreHorizontal, AlertCircle, Clock, Activity, 
    MailOpen, History, RefreshCw, Lock, 
    Users, Server, ArrowUpDown, Terminal, Check
} from "lucide-react";

// --- Types ---
interface UserData {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "CLIENT";
    _count?: { servers: number };
    createdAt?: string;
    lastLogin?: string;
    avatar?: string;
    status?: "online" | "offline" | "away";
    phone?: string;
    company?: string;
    department?: string;
    notes?: string;
}

interface UserActivity {
    id: string;
    userId: string;
    action: string;
    timestamp: string;
    ipAddress?: string;
    details?: string;
}

export default function UserManagement({ users }: { users: UserData[] }) {
    const router = useRouter();

    // --- UI States ---
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "CLIENT">("ALL");
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // --- Modal Visibility States ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showEmailTemplatesModal, setShowEmailTemplatesModal] = useState(false);
    
    // --- Data Selection States ---
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [resetUser, setResetUser] = useState<UserData | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
    const [selectedUserForActivity, setSelectedUserForActivity] = useState<UserData | null>(null);

    // --- Form Data ---
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "CLIENT", phone: "", company: "", department: "", notes: "" });
    const [newPass, setNewPass] = useState("");
    
    // --- Activity Data ---
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [vpsLoadingStates, setVpsLoadingStates] = useState<Record<string, boolean>>({});

    // --- Filtering ---
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.id.includes(searchTerm);
            const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    // --- Stats ---
    const stats = [
        { label: "Total Users", value: users.length, icon: Users },
        { label: "Admins", value: users.filter(u => u.role === 'ADMIN').length, icon: Shield },
        { label: "Servers Assigned", value: users.reduce((acc, u) => acc + (u._count?.servers || 0), 0), icon: Server },
    ];

    // --- Helpers ---
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast notification logic here if needed
    };

    const generateAvatar = (name: string) => {
        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
        const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[colorIndex];
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const selectAllUsers = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user.id));
        }
    };

    // --- Handlers ---
    const handleOpenAdd = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "CLIENT", phone: "", company: "", department: "", notes: "" });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (user: UserData) => {
        setEditingUser(user);
        setFormData({ 
            name: user.name, 
            email: user.email, 
            password: "", 
            role: user.role,
            phone: user.phone || "",
            company: user.company || "",
            department: user.department || "",
            notes: user.notes || ""
        });
        setIsFormOpen(true);
        setActiveMenu(null);
    };

    const handleUserActivity = async (user: UserData) => {
        setSelectedUserForActivity(user);
        setLoadingActivities(true);
        setShowActivityModal(true);
        setActiveMenu(null);
        try {
            // Mock API call
            await new Promise(r => setTimeout(r, 500)); 
            const mockActivities: UserActivity[] = [
                { id: '1', userId: user.id, action: 'Login', timestamp: new Date().toISOString(), ipAddress: '192.168.1.1' },
                { id: '2', userId: user.id, action: 'Password Changed', timestamp: new Date(Date.now() - 86400000).toISOString() },
                { id: '3', userId: user.id, action: 'Server Created', timestamp: new Date(Date.now() - 172800000).toISOString(), details: 'web-server-01' },
            ];
            setUserActivities(mockActivities);
        } catch (error) {
            alert('Failed to load user activity');
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleVpsAction = async (userId: string, action: string) => {
        setVpsLoadingStates(prev => ({ ...prev, [`${userId}-${action}`]: true }));
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // alert(`${action} completed successfully`);
        } catch (error) {
            // alert(`Failed to ${action}`);
        } finally {
            setVpsLoadingStates(prev => ({ ...prev, [`${userId}-${action}`]: false }));
        }
    };

    const handleSubmitUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUser) {
                await axios.put(`/api/admin/users/${editingUser.id}`, {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role
                });
            } else {
                await axios.post("/api/admin/users", formData);
            }
            setIsFormOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.response?.data?.error || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`/api/admin/users/${resetUser?.id}/password`, { password: newPass });
            setResetUser(null);
            setNewPass("");
            alert("Password reset successfully");
        } catch (error: any) {
            alert("Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        setLoading(true);
        try {
            await axios.delete(`/api/admin/users/${deleteUser.id}`);
            setDeleteUser(null);
            router.refresh();
        } catch (error: any) {
            alert("Failed to delete user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-zinc-800">
            <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8 space-y-6">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.map((stat, index) => (
                        <div key={index} className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-zinc-600 focus:outline-none transition-all placeholder:text-zinc-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {/* Role Filter */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                                <Filter className="w-4 h-4" />
                                <span>{roleFilter === 'ALL' ? 'All Roles' : roleFilter}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="absolute top-full mt-1 left-0 w-40 bg-[#09090b] border border-zinc-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-30">
                                {['ALL', 'ADMIN', 'CLIENT'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setRoleFilter(role as any)}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-zinc-900 transition-colors ${
                                            roleFilter === role ? 'text-white bg-zinc-900' : 'text-zinc-500'
                                        }`}
                                    >
                                        {role === 'ALL' ? 'All Roles' : role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <button
                            onClick={() => setShowEmailTemplatesModal(true)}
                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Email Templates"
                        >
                            <MailOpen className="w-4 h-4" />
                        </button>
                        
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Toggle View"
                        >
                            {viewMode === 'grid' ? <ArrowUpDown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </button>
                        
                        <button
                            onClick={handleOpenAdd}
                            className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add User
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Indicator */}
                {selectedUsers.length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-bold uppercase">{selectedUsers.length} selected</span>
                        <div className="flex gap-2">
                             <button className="text-xs font-bold text-zinc-400 hover:text-white">Export CSV</button>
                             <button className="text-xs font-bold text-red-400 hover:text-red-300">Delete</button>
                        </div>
                    </div>
                )}

                {/* GRID VIEW */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 hover:border-zinc-700 transition-all relative group">
                                {/* Actions Menu Button */}
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    
                                    {activeMenu === user.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                                            <div className="absolute right-0 top-8 w-48 bg-[#09090b] border border-zinc-800 rounded-lg shadow-xl z-20 py-1">
                                                <button onClick={() => handleOpenEdit(user)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                                                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                                                </button>
                                                <button onClick={() => handleUserActivity(user)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                                                    <History className="w-3.5 h-3.5" /> Activity Log
                                                </button>
                                                <button onClick={() => { setResetUser(user); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                                                    <Key className="w-3.5 h-3.5" /> Reset Password
                                                </button>
                                                <div className="h-px bg-zinc-800 my-1" />
                                                <button onClick={() => { setDeleteUser(user); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-950/20 flex items-center gap-2">
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete User
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold text-white ${generateAvatar(user.name)}`}>
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        {/* Selection Checkbox (Overlay) */}
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id)}
                                            className="absolute -top-1 -left-1 w-4 h-4 border-zinc-800 rounded bg-zinc-900 text-white cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white truncate">{user.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                user.status === 'online' ? 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/50' :
                                                'bg-zinc-900 text-zinc-500 border border-zinc-800'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                                                {user.status || 'offline'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                user.role === 'ADMIN' 
                                                ? 'bg-purple-950/30 text-purple-400 border-purple-900/50' 
                                                : 'bg-blue-950/30 text-blue-400 border-blue-900/50'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-zinc-950/50 border border-zinc-900 rounded p-2">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Servers</p>
                                        <p className="text-sm font-mono text-white">{user._count?.servers || 0}</p>
                                    </div>
                                    <div className="bg-zinc-950/50 border border-zinc-900 rounded p-2">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Last Login</p>
                                        <p className="text-sm font-mono text-zinc-400">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-zinc-950/50 border border-zinc-900 rounded p-2 flex items-center gap-2 mb-4">
                                    <Mail className="w-3 h-3 text-zinc-500" />
                                    <span className="text-xs text-zinc-300 truncate">{user.email}</span>
                                    <button onClick={() => copyToClipboard(user.email)} className="ml-auto text-zinc-600 hover:text-white">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* VPS Quick Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleVpsAction(user.id, 'restart')}
                                        disabled={vpsLoadingStates[`${user.id}-restart`]}
                                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 py-2 rounded text-xs font-bold transition-colors border border-zinc-800 flex items-center justify-center gap-2"
                                    >
                                        {vpsLoadingStates[`${user.id}-restart`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        Restart
                                    </button>
                                    <button
                                        onClick={() => handleVpsAction(user.id, 'stop')}
                                        disabled={vpsLoadingStates[`${user.id}-stop`]}
                                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 py-2 rounded text-xs font-bold transition-colors border border-zinc-800 flex items-center justify-center gap-2"
                                    >
                                        {vpsLoadingStates[`${user.id}-stop`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                                        Stop
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/30">
                                    <th className="px-6 py-3 w-10">
                                        <input type="checkbox" checked={selectedUsers.length === filteredUsers.length} onChange={selectAllUsers} className="rounded bg-zinc-800 border-zinc-700" />
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Servers</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-900/30">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUserSelection(user.id)} className="rounded bg-zinc-800 border-zinc-700" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${generateAvatar(user.name)}`}>
                                                    {user.name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{user.name}</div>
                                                    <div className="text-xs text-zinc-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${user.role === 'ADMIN' ? 'bg-purple-950/20 text-purple-400 border-purple-900/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase ${user.status === 'online' ? 'text-emerald-500' : 'text-zinc-500'}`}>{user.status || 'Offline'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-zinc-300">{user._count?.servers || 0}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenEdit(user)} className="text-zinc-500 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleUserActivity(user)} className="text-zinc-500 hover:text-white"><History className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- Modals --- */}

            {/* Add/Edit User Modal */}
            {isFormOpen && (
                <Modal title={editingUser ? "Edit User Profile" : "Create New User"} onClose={() => setIsFormOpen(false)}>
                    <form onSubmit={handleSubmitUser} className="space-y-5">
                        <InputGroup label="Full Name" value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} placeholder="Enter name" />
                        <InputGroup label="Email Address" value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} placeholder="name@domain.com" />
                        {!editingUser && (
                             <InputGroup label="Initial Password" value={formData.password} onChange={(v: string) => setFormData({ ...formData, password: v })} type="password" placeholder="••••••••" />
                        )}
                        
                        <InputGroup label="Company" value={formData.company} onChange={(v: string) => setFormData({...formData, company: v})} placeholder="Organization Name" />
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Access Level</label>
                            <div className="grid grid-cols-2 gap-3">
                                <RoleSelectButton 
                                    selected={formData.role === 'CLIENT'} 
                                    onClick={() => setFormData({...formData, role: 'CLIENT'})}
                                    icon={Users}
                                    label="Client"
                                />
                                <RoleSelectButton 
                                    selected={formData.role === 'ADMIN'} 
                                    onClick={() => setFormData({...formData, role: 'ADMIN'})}
                                    icon={Shield}
                                    label="Admin"
                                />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                             <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                             <button type="submit" disabled={loading} className="px-6 py-2 bg-white hover:bg-zinc-200 text-black rounded text-xs font-bold transition-colors">
                                {loading ? "Processing..." : "Save User"}
                             </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Activity Modal */}
            {showActivityModal && selectedUserForActivity && (
                <Modal title="User Activity Log" onClose={() => setShowActivityModal(false)}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${generateAvatar(selectedUserForActivity.name)}`}>
                                {selectedUserForActivity.name?.[0]}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{selectedUserForActivity.name}</p>
                                <p className="text-xs text-zinc-500">{selectedUserForActivity.email}</p>
                            </div>
                        </div>

                        {loadingActivities ? (
                            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {userActivities.map((log) => (
                                    <div key={log.id} className="flex gap-3 text-xs p-2 border-l-2 border-zinc-800 pl-3">
                                        <div className="text-zinc-500 font-mono min-w-[120px]">{new Date(log.timestamp).toLocaleString()}</div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{log.action}</p>
                                            {log.details && <p className="text-zinc-500 mt-0.5">{log.details}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Email Templates Modal */}
            {showEmailTemplatesModal && (
                <Modal title="Email Templates" onClose={() => setShowEmailTemplatesModal(false)}>
                    <div className="space-y-4">
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                            <p className="text-xs font-bold text-zinc-400 mb-2 uppercase">Welcome Email</p>
                            <textarea className="w-full h-20 bg-black border border-zinc-800 rounded p-2 text-xs text-zinc-300 resize-none" defaultValue="Welcome {{name}}! Your account is ready." />
                        </div>
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                            <p className="text-xs font-bold text-zinc-400 mb-2 uppercase">Password Reset</p>
                            <textarea className="w-full h-20 bg-black border border-zinc-800 rounded p-2 text-xs text-zinc-300 resize-none" defaultValue="Click here to reset your password." />
                        </div>
                        <div className="flex justify-end pt-2">
                             <button onClick={() => setShowEmailTemplatesModal(false)} className="bg-white text-black px-4 py-2 rounded text-xs font-bold">Save Templates</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetUser && (
                <Modal title="Security Update" onClose={() => setResetUser(null)}>
                    <div className="bg-zinc-900 p-4 rounded-lg mb-4 flex gap-3 border border-zinc-800">
                        <Terminal className="w-5 h-5 text-zinc-500" />
                        <div className="text-xs text-zinc-400">
                            <p className="mb-1 text-white font-bold">Reset Password</p>
                            <p>Enter a new password for <span className="text-white">{resetUser.name}</span>.</p>
                        </div>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                         <InputGroup label="New Password" value={newPass} onChange={(v: string) => setNewPass(v)} placeholder="New secure password" />
                         <button type="submit" disabled={loading} className="w-full py-2 bg-white hover:bg-zinc-200 text-black rounded text-xs font-bold transition-colors">
                            Update Credentials
                         </button>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteUser && (
                <Modal title="Confirm Deletion" onClose={() => setDeleteUser(null)}>
                    <div className="text-center py-4">
                        <p className="text-zinc-300 text-sm mb-2">Permanently delete <span className="text-white font-bold">{deleteUser.name}</span>?</p>
                        <p className="text-zinc-500 text-xs">This action cannot be undone.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setDeleteUser(null)} className="py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-bold transition-colors border border-zinc-800">Cancel</button>
                        <button onClick={handleDelete} className="py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors">Confirm Delete</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// --- Reusable Components ---

function Modal({ title, onClose, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] w-full max-w-md rounded-xl border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function InputGroup({ label, value, onChange, type = "text", placeholder }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
            <input
                type={type}
                className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-all font-mono"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                required
            />
        </div>
    );
}

function RoleSelectButton({ selected, onClick, icon: Icon, label }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                selected 
                ? "bg-white text-black border-white" 
                : "bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
            }`}
        >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}