"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { 
    Loader2, Send, User, Mail, Eye, Code, FileText, 
    Sparkles, AlertTriangle, Check, ChevronDown, RefreshCw 
} from "lucide-react";

// --- Templates Data ---
const TEMPLATES: Record<string, { name: string, subject: string, content: string, icon: any, color: string }> = {
    welcome: {
        name: "Welcome Aboard",
        subject: "Welcome to VexaNode! 🚀",
        icon: Sparkles,
        color: "text-blue-400",
        content: `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #000000; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to VexaNode</h1>
    </div>
    <div style="padding: 40px;">
        <p style="font-size: 16px; color: #334155;">Hello {{name}},</p>
        <p style="color: #475569; line-height: 1.6;">Your account has been successfully created. You now have full access to our high-performance cloud infrastructure.</p>
        <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXTAUTH_URL || 'https://vps.vexanode.cloud'}/client" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Access Dashboard</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">If you didn't request this, please ignore this email.</p>
    </div>
</div>`
    },
    warning: {
        name: "Service Warning",
        subject: "⚠️ Action Required: Service Notice",
        icon: AlertTriangle,
        color: "text-amber-400",
        content: `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #fee2e2;">
    <div style="background-color: #dc2626; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Service Notice</h1>
    </div>
    <div style="padding: 40px;">
        <p style="font-size: 16px; color: #334155;">Dear {{name}},</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: 500;">We detected unusual activity on your account.</p>
        </div>
        <p style="color: #475569; line-height: 1.6;">Please review your recent usage immediately to avoid service interruption.</p>
        <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXTAUTH_URL || 'https://vps.vexanode.cloud'}/support" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Contact Support</a>
        </div>
    </div>
</div>`
    },
    maintenance: {
        name: "Maintenance",
        subject: "Scheduled Maintenance Alert",
        icon: RefreshCw,
        color: "text-purple-400",
        content: `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #7c3aed; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">System Upgrade</h1>
    </div>
    <div style="padding: 40px;">
        <p style="font-size: 16px; color: #334155;">Hello {{name}},</p>
        <p style="color: #475569; line-height: 1.6;">We will be performing scheduled maintenance on our infrastructure to improve performance.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Expected Duration</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">2 Hours</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Date</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">Upcoming Weekend</td>
            </tr>
        </table>
    </div>
</div>`
    }
};

export default function SendMailForm({ users }: { users: any[] }) {
    // State
    const [recipientType, setRecipientType] = useState<'USER' | 'MANUAL'>('USER');
    const [selectedUser, setSelectedUser] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState<'CODE' | 'VISUAL'>('VISUAL');

    // Helper to insert variables
    const insertVariable = (variable: string) => {
        setContent(prev => prev + ` {{${variable}}} `);
    };

    // Load Template
    const loadTemplate = (key: string) => {
        const t = TEMPLATES[key];
        if (t) {
            setSubject(t.subject);
            setContent(t.content);
        }
    };

    // Derived: Preview HTML with dummy data
    const previewHtml = content
        .replace(/{{name}}/g, selectedUser ? users.find(u => u.id === selectedUser)?.name : "John Doe")
        .replace(/{{email}}/g, selectedUser ? users.find(u => u.id === selectedUser)?.email : "john@example.com");

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content || !subject) return alert("Please fill in all fields");
        setLoading(true);

        const recipient = recipientType === 'USER' ? "" : manualEmail;
        const userId = recipientType === 'USER' ? selectedUser : undefined;

        try {
            await axios.post("/api/admin/send-mail", { recipient, userId, subject, content });
            alert("Email dispatched successfully!");
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to send email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-zinc-800">
            <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-8">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Send className="w-6 h-6 text-white" />
                            Email Composer
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">Send transactional emails to users or external contacts.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={() => setContent("")}
                            className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
                    
                    {/* LEFT: Editor */}
                    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                        
                        {/* 1. Recipient Config */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recipient</label>
                                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                                    <button
                                        onClick={() => setRecipientType('USER')}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                            recipientType === 'USER' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Platform User
                                    </button>
                                    <button
                                        onClick={() => setRecipientType('MANUAL')}
                                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                            recipientType === 'MANUAL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        External Email
                                    </button>
                                </div>
                            </div>

                            {recipientType === 'USER' ? (
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <select
                                        className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-zinc-600 transition-colors"
                                        value={selectedUser}
                                        onChange={e => setSelectedUser(e.target.value)}
                                    >
                                        <option value="">Select a user...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                                        placeholder="external@example.com"
                                        value={manualEmail}
                                        onChange={e => setManualEmail(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. Templates & Metadata */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Quick Templates</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(TEMPLATES).map(([key, t]) => (
                                        <button
                                            key={key}
                                            onClick={() => loadTemplate(key)}
                                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700 transition-all group text-center"
                                        >
                                            <t.icon className={`w-5 h-5 ${t.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform`} />
                                            <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Subject Line</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors font-bold placeholder:text-zinc-700"
                                        placeholder="Enter subject..."
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Content Body</label>
                                        <div className="flex gap-2">
                                            {['name', 'email', 'date'].map(v => (
                                                <button 
                                                    key={v}
                                                    onClick={() => insertVariable(v)}
                                                    className="text-[10px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors font-mono"
                                                >
                                                    {`{{${v}}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-80 bg-black border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 font-mono focus:outline-none focus:border-zinc-600 transition-colors resize-none leading-relaxed custom-scrollbar"
                                        placeholder="<html>Write your HTML email content here...</html>"
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Actions */}
                        <button
                            onClick={handleSend}
                            disabled={loading || (!selectedUser && !manualEmail)}
                            className="w-full bg-white hover:bg-zinc-200 text-black py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? "Dispatching..." : "Send Email"}
                        </button>

                    </div>

                    {/* RIGHT: Live Preview */}
                    <div className="hidden xl:flex flex-col h-full bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Live Preview
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                <button
                                    onClick={() => setPreviewMode('VISUAL')}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                        previewMode === 'VISUAL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    <FileText className="w-3 h-3" /> Visual
                                </button>
                                <button
                                    onClick={() => setPreviewMode('CODE')}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                        previewMode === 'CODE' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    <Code className="w-3 h-3" /> Source
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white relative overflow-hidden">
                            {previewMode === 'VISUAL' ? (
                                <iframe
                                    srcDoc={previewHtml}
                                    title="Email Preview"
                                    className="w-full h-full border-none"
                                    sandbox="allow-same-origin"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#0d1117] p-4 overflow-auto">
                                    <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all">
                                        {previewHtml}
                                    </pre>
                                </div>
                            )}
                            
                            {/* Overlay if empty */}
                            {!content && previewMode === 'VISUAL' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/50 backdrop-blur-sm">
                                    <Mail className="w-12 h-12 text-zinc-300 mb-2" />
                                    <p className="text-zinc-400 text-sm font-medium">Start typing to see preview</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                            <span>Rendered View</span>
                            <span>{content.length} chars</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}