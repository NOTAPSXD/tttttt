"use client";

import { Mail, ShieldCheck, Clock3, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ClientAccount, timeAgo, formatDate } from "@/lib/clientserver";

interface AccountCardProps {
    account: ClientAccount | null;
}

export function AccountCard({ account }: AccountCardProps) {
    const tz = typeof window !== "undefined"
        ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "—")
        : "—";

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary-blue" /> Account
                    </CardTitle>
                    <CardDescription>{account?.email ?? "Loading…"}</CardDescription>
                </div>
                {account ? (
                    <StatusBadge
                        label={account.twoFactorEnabled ? "2FA Active" : "2FA Inactive"}
                        tone={account.twoFactorEnabled ? "success" : "muted"}
                    />
                ) : (
                    <Skeleton className="h-5 w-24 rounded-full" />
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-panel-muted">
                        <ShieldCheck className="h-3.5 w-3.5" /> Two-factor auth
                    </span>
                    <span className={account?.twoFactorEnabled ? "text-success-green" : "text-panel-muted"}>
                        {account?.twoFactorEnabled ? "Enabled" : "Not enabled"}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-panel-muted">
                        <Clock3 className="h-3.5 w-3.5" /> Last login
                    </span>
                    <span className="text-panel-text">{account ? timeAgo(account.lastLogin) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-panel-muted">
                        <Globe className="h-3.5 w-3.5" /> Timezone
                    </span>
                    <span className="font-mono text-xs text-panel-text">{tz}</span>
                </div>
                {account?.createdAt && (
                    <div className="flex items-center justify-between border-t border-stroke pt-3 text-sm">
                        <span className="text-panel-muted">Member since</span>
                        <span className="text-panel-text">{formatDate(account.createdAt)}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default AccountCard;