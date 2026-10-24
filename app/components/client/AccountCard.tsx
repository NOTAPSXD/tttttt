/**
 * AccountCard — compact panel showing account details.
 *
 * Requirements:
 * - Email, member since, timezone (mono), last login, 2FA row.
 * - If 2FA is OFF → clear "Enable 2FA" button instead of a passive badge.
 * - Monospace font for timezone (technical value).
 * - Graceful empty values ("-" not "0%").
 * - Design tokens: surface #11141a, border #1f242d, radius 8px, text #e6e8ec, muted #8b93a1.
 */
"use client";

import Link from "next/link";
import { Mail, ShieldCheck, Clock3, Globe, CalendarDays } from "lucide-react";
import { Panel, PanelHeader, PanelTitle, StatusDot } from "@/app/components/ui/primitives";
import { ClientAccount, timeAgo, formatDate } from "@/lib/clientserver";

interface AccountCardProps {
    account: ClientAccount | null;
}

interface RowProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

function Row({ icon, label, value }: RowProps) {
    return (
        <div
            className="flex items-center justify-between gap-4 py-2.5"
            style={{ borderBottom: "1px solid #1f242d" }}
        >
            <span className="flex items-center gap-2 text-[12px] shrink-0 text-[#8b93a1]">
                <span aria-hidden="true" className="text-[#8b93a1]">{icon}</span>
                {label}
            </span>
            <div className="text-[12px] text-right text-[#e6e8ec] truncate">
                {value}
            </div>
        </div>
    );
}

export function AccountCard({ account }: AccountCardProps) {
    const tz =
        typeof window !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone || "-"
            : "-";

    return (
        <Panel flush>
            <PanelHeader>
                <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#8b93a1]" aria-hidden="true" />
                    <PanelTitle>Account</PanelTitle>
                </div>
                {account?.email && (
                    <span className="text-[12px] text-[#8b93a1] truncate max-w-[180px]">
                        {account.email}
                    </span>
                )}
            </PanelHeader>

            <div className="px-5 pt-1 pb-3 [&>div:last-child]:border-b-0">
                <Row
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    label="Two-factor auth"
                    value={
                        account?.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#22c55e]">
                                <StatusDot tone="success" />
                                Enabled
                            </span>
                        ) : (
                            <Link
                                href="/client/settings"
                                className="inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 transition-colors duration-150 border border-[#3b82f6]/25 focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:outline-none min-h-[28px]"
                            >
                                Enable 2FA
                            </Link>
                        )
                    }
                />
                <Row
                    icon={<Clock3 className="h-3.5 w-3.5" />}
                    label="Last login"
                    value={account?.lastLogin ? timeAgo(account.lastLogin) : "-"}
                />
                <Row
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Timezone"
                    value={
                        <span className="font-mono text-[11px] text-[#e6e8ec]">
                            {tz}
                        </span>
                    }
                />
                <Row
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label="Member since"
                    value={account?.createdAt ? formatDate(account.createdAt) : "-"}
                />
            </div>
        </Panel>
    );
}

export default AccountCard;
