"use client";

import { useState, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
    Loader2, Send, Users, Mail, Eye, Code,
    Sparkles, AlertTriangle, Check, RefreshCw,
    Search, CheckSquare, Square, X, Monitor,
    Smartphone, Info, Megaphone, Bell
} from "lucide-react";

// --- Types ---
export interface UserItem {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
    status: string;
}

type RecipientMode = "USERS" | "BROADCAST" | "MANUAL";
type PreviewDevice = "DESKTOP" | "MOBILE";
type PreviewTab = "VISUAL" | "CODE";

// --- Templates ---
interface TemplateDef {
    name: string;
    description: string;
    subject: string;
    icon: any;
    color: string;
    content: string;
}

const TEMPLATES: Record<string, TemplateDef> = {
    welcome: {
        name: "Welcome Aboard",
        description: "New user greeting & dashboard access",
        subject: "Welcome to VexaNode! 🚀",
        icon: Sparkles,
        color: "text-blue-400",
        content: `<div style="margin: 0; padding: 24px 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
    <tr>
      <td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 32px 40px; text-align: left; border-bottom: 2px solid #2563eb;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">VEXA<span style="color: #3b82f6;">NODE</span></span>
            </td>
            <td align="right">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a1a1aa; font-weight: 700;">Cloud Platform</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 40px 32px 40px; color: #1e293b;">
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Welcome aboard, {{name}}! 🚀</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
          Your VexaNode account has been successfully created. You now have full access to provision, manage, and monitor your high-performance VPS instances in real time.
        </p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Account:</strong> {{email}}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;"><strong>Role:</strong> {{role}} &bull; <strong>Date:</strong> {{date}}</p>
            </td>
          </tr>
        </table>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0 24px 0;">
          <tr>
            <td align="center">
              <a href="{{dashboard_url}}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                Access Your Dashboard &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          &copy; {{year}} VexaNode Inc. All rights reserved.<br/>
          If you didn't request this email, you can safely ignore it.
        </p>
      </td>
    </tr>
  </table>
</div>`
    },
    announcement: {
        name: "Announcement",
        description: "General system or product news",
        subject: "📢 Important Update from VexaNode",
        icon: Megaphone,
        color: "text-emerald-400",
        content: `<div style="margin: 0; padding: 24px 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
    <tr>
      <td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 32px 40px; text-align: left; border-bottom: 2px solid #10b981;">
        <span style="font-size: 20px; font-weight: 800; color: #ffffff;">VEXA<span style="color: #10b981;">NODE</span></span>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 40px 32px 40px; color: #1e293b;">
        <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">Announcement</span>
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Hello {{name}},</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
          We are pleased to introduce new performance upgrades across our VPS fleet. All nodes now benefit from improved network routing and enhanced SSD I/O bandwidth.
        </p>
        <div style="background-color: #f1f5f9; padding: 18px 22px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 600;">Highlights:</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.7;">
            <li>Zero downtime during routine background health sweeps</li>
            <li>Faster snapshot capture and restore latency</li>
            <li>Updated real-time bandwidth metrics</li>
          </ul>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="{{dashboard_url}}" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                Open Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; {{year}} VexaNode &bull; Sent on {{date}}</p>
      </td>
    </tr>
  </table>
</div>`
    },
    maintenance: {
        name: "Maintenance",
        description: "Scheduled infrastructure maintenance",
        subject: "🔧 Scheduled Maintenance Notification",
        icon: RefreshCw,
        color: "text-purple-400",
        content: `<div style="margin: 0; padding: 24px 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
    <tr>
      <td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 32px 40px; text-align: left; border-bottom: 2px solid #8b5cf6;">
        <span style="font-size: 20px; font-weight: 800; color: #ffffff;">VEXA<span style="color: #a78bfa;">NODE</span></span>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 40px 32px 40px; color: #1e293b;">
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Maintenance Notice</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
          Hello {{name}}, our engineering team has scheduled core network firmware maintenance to preserve high availability.
        </p>
        <table width="100%" style="border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 0; color: #64748b;">Scheduled Window</td>
            <td style="padding: 12px 0; color: #0f172a; font-weight: 600; text-align: right;">Upcoming Weekend, 02:00 – 04:00 UTC</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 0; color: #64748b;">Estimated Duration</td>
            <td style="padding: 12px 0; color: #0f172a; font-weight: 600; text-align: right;">~45 minutes</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b;">Expected Impact</td>
            <td style="padding: 12px 0; color: #8b5cf6; font-weight: 600; text-align: right;">Brief network packet rerouting</td>
          </tr>
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          Your VPS data and disk contents will not be altered. If you have questions, please reach out via support ticket.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; {{year}} VexaNode Infrastructure</p>
      </td>
    </tr>
  </table>
</div>`
    },
    warning: {
        name: "Security Notice",
        description: "Account alert or action required",
        subject: "⚠️ Action Required: Security Notice",
        icon: AlertTriangle,
        color: "text-amber-400",
        content: `<div style="margin: 0; padding: 24px 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
    <tr>
      <td style="background-color: #dc2626; padding: 30px 40px; text-align: left;">
        <span style="font-size: 20px; font-weight: 800; color: #ffffff;">VEXANODE &bull; SECURITY</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 40px 32px 40px; color: #1e293b;">
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #991b1b;">Security Alert</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
          Dear {{name}}, we observed unusual activity or an unverified sign-in attempt associated with your account ({{email}}).
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">Action Suggested:</p>
          <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px;">Please change your password immediately and review active sessions.</p>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="{{dashboard_url}}" style="display: inline-block; background: #dc2626; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                Review Account Security &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; {{year}} VexaNode Trust & Safety</p>
      </td>
    </tr>
  </table>
</div>`
    },
};

const PLACEHOLDER_LIST = [
    { key: "name", label: "{{name}}", desc: "Recipient full name" },
    { key: "email", label: "{{email}}", desc: "Recipient email" },
    { key: "role", label: "{{role}}", desc: "User role (e.g. CLIENT)" },
    { key: "date", label: "{{date}}", desc: "Current formatted date" },
    { key: "year", label: "{{year}}", desc: "Current year" },
    { key: "dashboard_url", label: "{{dashboard_url}}", desc: "Panel login URL" },
    { key: "app_name", label: "{{app_name}}", desc: "Platform name" },
];

export default function SendMailForm({ users }: { users: UserItem[] }) {
    // Mode
    const [mode, setMode] = useState<RecipientMode>("USERS");

    // Multiple user selection state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");

    // Broadcast state
    const [broadcastRole, setBroadcastRole] = useState<string>("ALL");

    // Manual emails state
    const [manualEmails, setManualEmails] = useState("");

    // Email content state — defaults to Welcome template on first render
    const [activeTemplateKey, setActiveTemplateKey] = useState<string>("welcome");
    const [subject, setSubject] = useState<string>(TEMPLATES.welcome.subject);
    const [content, setContent] = useState<string>(TEMPLATES.welcome.content);

    // UI State
    const [loading, setLoading] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [previewTab, setPreviewTab] = useState<PreviewTab>("VISUAL");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("DESKTOP");

    // Textarea ref for cursor-based variable insertion
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Filtered users for multi-select
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                !searchQuery ||
                u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchQuery, roleFilter]);

    // Derived sample recipient for preview
    const sampleRecipient = useMemo(() => {
        if (mode === "USERS" && selectedUserIds.length > 0) {
            const first = users.find((u) => u.id === selectedUserIds[0]);
            if (first) return first;
        }
        if (mode === "MANUAL" && manualEmails.trim()) {
            const firstEmail = manualEmails.split(/[,;\n\r]+/)[0]?.trim();
            if (firstEmail) {
                return {
                    id: "preview",
                    name: firstEmail.split("@")[0],
                    email: firstEmail,
                    role: "External",
                    status: "active",
                };
            }
        }
        return {
            id: "preview",
            name: "Ansh Singh",
            email: "anshthedev59@gmail.com",
            role: "CLIENT",
            status: "active",
        };
    }, [mode, selectedUserIds, users, manualEmails]);

    // Live rendered preview HTML with placeholders resolved
    const previewHtml = useMemo(() => {
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const yearStr = String(now.getFullYear());
        const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:2004";

        return content
            .replace(/{{\s*name\s*}}/gi, sampleRecipient.name || "Customer")
            .replace(/{{\s*email\s*}}/gi, sampleRecipient.email || "")
            .replace(/{{\s*role\s*}}/gi, sampleRecipient.role || "CLIENT")
            .replace(/{{\s*date\s*}}/gi, dateStr)
            .replace(/{{\s*year\s*}}/gi, yearStr)
            .replace(/{{\s*(?:app_name|appName)\s*}}/gi, "VexaNode")
            .replace(/{{\s*(?:dashboard_url|dashboardUrl|app_url|appUrl)\s*}}/gi, `${appUrl}/client`);
    }, [content, sampleRecipient]);

    // Toggle single user
    const toggleUser = (id: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Select all currently filtered users
    const handleSelectAllFiltered = () => {
        const filteredIds = filteredUsers.map((u) => u.id);
        const combined = Array.from(new Set([...selectedUserIds, ...filteredIds]));
        setSelectedUserIds(combined);
    };

    // Deselect all
    const handleClearSelection = () => {
        setSelectedUserIds([]);
    };

    // Insert variable at cursor position
    const insertVariable = (variable: string) => {
        const tag = `{{${variable}}}`;
        const textarea = textareaRef.current;
        if (!textarea) {
            setContent((prev) => prev + tag);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const updated = text.substring(0, start) + tag + text.substring(end);
        setContent(updated);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 10);
    };

    // Load template
    const loadTemplate = (key: string) => {
        const t = TEMPLATES[key];
        if (!t) return;
        setActiveTemplateKey(key);
        setSubject(t.subject);
        setContent(t.content);
        toast.info(`Loaded "${t.name}" template`);
    };

    // Target count
    const targetCount = useMemo(() => {
        if (mode === "USERS") return selectedUserIds.length;
        if (mode === "BROADCAST") {
            if (broadcastRole === "ALL") return users.length;
            return users.filter((u) => u.role === broadcastRole).length;
        }
        if (mode === "MANUAL") {
            return manualEmails
                .split(/[,;\n\r]+/)
                .map((s) => s.trim())
                .filter((s) => s.includes("@")).length;
        }
        return 0;
    }, [mode, selectedUserIds, broadcastRole, users, manualEmails]);

    // Send email handler
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !subject.trim()) {
            toast.error("Subject and content body cannot be empty");
            return;
        }

        if (mode === "USERS" && selectedUserIds.length === 0) {
            toast.error("Please select at least one recipient user");
            return;
        }

        if (mode === "MANUAL") {
            const count = manualEmails
                .split(/[,;\n\r]+/)
                .map((s) => s.trim())
                .filter((s) => s.includes("@")).length;
            if (count === 0) {
                toast.error("Please enter at least one valid email address");
                return;
            }
        }

        setLoading(true);
        const toastId = toast.loading(`Dispatching email to ${targetCount} recipient${targetCount === 1 ? "" : "s"}...`);

        try {
            const payload: Record<string, any> = {
                subject,
                content,
            };

            if (mode === "USERS") {
                payload.userIds = selectedUserIds;
            } else if (mode === "BROADCAST") {
                payload.sendToAll = true;
                if (broadcastRole !== "ALL") {
                    payload.targetRole = broadcastRole;
                }
            } else if (mode === "MANUAL") {
                const parts = manualEmails
                    .split(/[,;\n\r]+/)
                    .map((s) => s.trim())
                    .filter((s) => s.includes("@"));
                payload.recipients = parts;
            }

            const { data } = await axios.post("/api/admin/send-mail", payload);

            toast.dismiss(toastId);
            toast.success(data.message || "Emails dispatched successfully!");

            if (mode === "USERS") {
                setSelectedUserIds([]);
            } else if (mode === "MANUAL") {
                setManualEmails("");
            }
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(err.response?.data?.error || "Failed to dispatch email. Please check SMTP settings.");
        } finally {
            setLoading(false);
        }
    };

    // Send Quick Test to logged in admin
    const handleSendTest = async () => {
        if (!content.trim() || !subject.trim()) {
            toast.error("Enter a subject and content before testing");
            return;
        }

        const destination = sampleRecipient.email || "admin@example.com";
        setSendingTest(true);
        const toastId = toast.loading(`Sending test email to ${destination}...`);

        try {
            await axios.post("/api/admin/send-mail", {
                recipient: destination,
                subject: `[TEST] ${subject}`,
                content,
            });
            toast.dismiss(toastId);
            toast.success(`Test email delivered to ${destination}!`);
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(err.response?.data?.error || "Failed to send test email");
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-zinc-800">
            <div className="max-w-[1850px] mx-auto px-4 lg:px-6 py-6">
                
                {/* 1. Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-5">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <Send className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    Email Composer
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        SMTP Live
                                    </span>
                                </h1>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Send transactional updates, platform announcements, and personalized outreach.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSendTest}
                            disabled={sendingTest || !content.trim()}
                            className="px-3.5 py-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-blue-400" />}
                            Send Test Email
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSubject("");
                                setContent("");
                                setActiveTemplateKey("");
                                toast.info("Editor cleared");
                            }}
                            className="px-3 py-2 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* 2. Main 2-Column Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
                    
                    {/* LEFT COLUMN: Controls & Editor (7 cols) */}
                    <div className="xl:col-span-7 flex flex-col gap-5 h-full overflow-y-auto pr-1">
                        
                        {/* A. Recipient Selector Card */}
                        <div className="bg-[#09090b] border border-zinc-800/80 rounded-xl p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        Recipients
                                    </label>
                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {targetCount} {targetCount === 1 ? "target" : "targets"}
                                    </span>
                                </div>

                                {/* Mode Switcher */}
                                <div className="flex bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setMode("USERS")}
                                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                                            mode === "USERS"
                                                ? "bg-zinc-800 text-white shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        Select Users ({selectedUserIds.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode("BROADCAST")}
                                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                                            mode === "BROADCAST"
                                                ? "bg-zinc-800 text-white shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        <Megaphone className="w-3.5 h-3.5" />
                                        Broadcast All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode("MANUAL")}
                                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                                            mode === "MANUAL"
                                                ? "bg-zinc-800 text-white shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        External Emails
                                    </button>
                                </div>
                            </div>

                            {/* MODE 1: MULTI USER PICKER */}
                            {mode === "USERS" && (
                                <div className="space-y-3">
                                    {/* Filter / Search Bar */}
                                    <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <div className="relative flex-1 w-full">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or email address..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-black border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>

                                        <select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            className="w-full sm:w-36 bg-black border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                                        >
                                            <option value="ALL">All Roles</option>
                                            <option value="CLIENT">Clients</option>
                                            <option value="ADMIN">Admins</option>
                                            <option value="SUPPORT">Support</option>
                                        </select>

                                        <div className="flex gap-1.5 w-full sm:w-auto">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllFiltered}
                                                className="flex-1 sm:flex-none px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-medium text-zinc-300 transition-colors whitespace-nowrap"
                                            >
                                                Select All ({filteredUsers.length})
                                            </button>
                                            {selectedUserIds.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelection}
                                                    className="px-2.5 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                                                >
                                                    Deselect
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Users Checklist Scroll Area */}
                                    <div className="max-h-48 overflow-y-auto border border-zinc-800/80 rounded-lg divide-y divide-zinc-900 bg-black/60 custom-scrollbar">
                                        {filteredUsers.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-zinc-500">
                                                No users matching query &ldquo;{searchQuery}&rdquo;
                                            </div>
                                        ) : (
                                            filteredUsers.map((u) => {
                                                const isSelected = selectedUserIds.includes(u.id);
                                                return (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => toggleUser(u.id)}
                                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                                                            isSelected ? "bg-blue-950/20" : "hover:bg-zinc-900/40"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="text-zinc-400">
                                                                {isSelected ? (
                                                                    <CheckSquare className="w-4 h-4 text-blue-400" />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-zinc-600" />
                                                                )}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-xs font-medium text-zinc-200 truncate">
                                                                    {u.name}
                                                                </p>
                                                                <p className="text-[11px] text-zinc-500 font-mono truncate">
                                                                    {u.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                                                                u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                                                                    ? "bg-purple-950/30 text-purple-400 border-purple-900/40"
                                                                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                                                            }`}
                                                        >
                                                            {u.role}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MODE 2: BROADCAST MODE */}
                            {mode === "BROADCAST" && (
                                <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Bell className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-white">Broadcast Mode Active</p>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                This will individually personalize and send the email to all active accounts in the database.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-1">
                                        <label className="text-xs text-zinc-400 font-medium">Filter Audience:</label>
                                        <select
                                            value={broadcastRole}
                                            onChange={(e) => setBroadcastRole(e.target.value)}
                                            className="bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                                        >
                                            <option value="ALL">All Active Users ({users.length})</option>
                                            <option value="CLIENT">Clients Only ({users.filter((u) => u.role === "CLIENT").length})</option>
                                            <option value="ADMIN">Admins Only ({users.filter((u) => u.role === "ADMIN").length})</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* MODE 3: MANUAL EXTERNAL EMAILS */}
                            {mode === "MANUAL" && (
                                <div className="space-y-1.5">
                                    <label className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                                        <span>Enter Recipient Email Addresses</span>
                                        <span className="text-[11px] text-zinc-500 font-normal">Separated by commas or new lines</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={manualEmails}
                                        onChange={(e) => setManualEmails(e.target.value)}
                                        placeholder="user1@example.com, client2@domain.com, support@vendor.com"
                                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        {/* B. Templates & Editor Card */}
                        <div className="bg-[#09090b] border border-zinc-800/80 rounded-xl p-4 space-y-4">
                            {/* Templates Bar */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        Quick Templates
                                    </label>
                                    <span className="text-[11px] text-zinc-500">
                                        Default: <span className="text-zinc-300">Welcome Aboard</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(TEMPLATES).map(([key, t]) => {
                                        const Icon = t.icon;
                                        const isActive = activeTemplateKey === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => loadTemplate(key)}
                                                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                                                    isActive
                                                        ? "bg-blue-950/30 border-blue-500/40 shadow-sm"
                                                        : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Icon className={`w-4 h-4 ${t.color}`} />
                                                    {isActive && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                                </div>
                                                <p className="text-xs font-semibold text-white mt-0.5">{t.name}</p>
                                                <p className="text-[10px] text-zinc-500 line-clamp-1">{t.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subject Line */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Welcome to VexaNode! 🚀"
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                                />
                            </div>

                            {/* Placeholder Insertion Tags */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        Personalization Placeholders
                                        <Info className="w-3.5 h-3.5 text-zinc-500" />
                                    </label>
                                    <span className="text-[10px] text-zinc-500">Click to insert at cursor</span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {PLACEHOLDER_LIST.map((p) => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => insertVariable(p.key)}
                                            title={p.desc}
                                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded text-[11px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HTML Content Body */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    HTML Email Body
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    rows={13}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your HTML template here..."
                                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono leading-relaxed placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 resize-none custom-scrollbar"
                                />
                            </div>
                        </div>

                        {/* C. Dispatch Action Button */}
                        <div className="pt-1 pb-4">
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={loading || targetCount === 0 || !content.trim() || !subject.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 border border-blue-500 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Dispatching to {targetCount} Recipient{targetCount === 1 ? "" : "s"}...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Dispatch Email ({targetCount} {targetCount === 1 ? "Recipient" : "Recipients"})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Live Preview Panel (5 cols) */}
                    <div className="xl:col-span-5 flex flex-col h-full bg-[#09090b] border border-zinc-800/80 rounded-xl overflow-hidden">
                        
                        {/* Preview Topbar */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-bold text-white tracking-wide uppercase">
                                    Live Preview
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px]">
                                    for {sampleRecipient.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Device Width Switch */}
                                <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice("DESKTOP")}
                                        className={`p-1.5 rounded text-xs transition-colors ${
                                            previewDevice === "DESKTOP" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                        title="Desktop view"
                                    >
                                        <Monitor className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice("MOBILE")}
                                        className={`p-1.5 rounded text-xs transition-colors ${
                                            previewDevice === "MOBILE" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                        title="Mobile view (375px)"
                                    >
                                        <Smartphone className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Visual / Source Code Tab */}
                                <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTab("VISUAL")}
                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                            previewTab === "VISUAL" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        <Eye className="w-3 h-3" /> Visual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTab("CODE")}
                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                            previewTab === "CODE" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        <Code className="w-3 h-3" /> Code
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Subject Preview Banner */}
                        <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Subject:</span>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                                {subject || "(No subject)"}
                            </span>
                        </div>

                        {/* Preview Canvas */}
                        <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center p-3">
                            {previewTab === "VISUAL" ? (
                                <div
                                    className={`h-full transition-all duration-200 bg-white shadow-2xl rounded-lg overflow-hidden ${
                                        previewDevice === "MOBILE" ? "w-[375px] border-4 border-zinc-800" : "w-full"
                                    }`}
                                >
                                    <iframe
                                        srcDoc={previewHtml}
                                        title="Rendered Email Output"
                                        className="w-full h-full border-none bg-white"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-[#0d1117] p-4 overflow-auto rounded-lg border border-zinc-800/80 custom-scrollbar">
                                    <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                                        {previewHtml}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Preview Footer Meta */}
                        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800/80 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                            <span>Sample data rendered for {sampleRecipient.name} ({sampleRecipient.email})</span>
                            <span>{content.length} chars</span>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
