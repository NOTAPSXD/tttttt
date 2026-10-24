import { randomBytes } from "crypto";
import { connectDB, Session } from "@/lib/db";
import { hashHex } from "@/lib/crypto";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newSessionId(): string {
    return randomBytes(24).toString("hex");
}

export function hashSession(sessionId: string): string {
    return hashHex(sessionId);
}

export function formatIp(ip?: string | null): string {
    if (!ip || !ip.trim()) return "Unknown IP";
    let cleaned = ip.trim();
    if (cleaned.startsWith("::ffff:")) {
        cleaned = cleaned.substring(7);
    }
    if (cleaned === "::1" || cleaned === "127.0.0.1") {
        return "Localhost (127.0.0.1)";
    }
    return cleaned;
}

export function deriveDeviceLabel(ua?: string): string {
    if (!ua || !ua.trim()) return "Web Browser";
    const cleanUa = ua.trim();

    // Developer / CLI / Script tools
    if (/^node|^axios|^curl|^postman|^python|^go-http/i.test(cleanUa) || cleanUa === "node") {
        return "API / Developer Client";
    }

    // Browsers
    let browser = "Web Browser";
    if (/Edg\//i.test(cleanUa)) {
        browser = "Microsoft Edge";
    } else if (/OPR\/|Opera/i.test(cleanUa)) {
        browser = "Opera";
    } else if (/Vivaldi/i.test(cleanUa)) {
        browser = "Vivaldi";
    } else if (/Brave/i.test(cleanUa)) {
        browser = "Brave";
    } else if (/Chrome\//i.test(cleanUa) && !/Chromium/i.test(cleanUa)) {
        browser = "Chrome";
    } else if (/Firefox\//i.test(cleanUa)) {
        browser = "Firefox";
    } else if (/Safari\//i.test(cleanUa) && !/Chrome/i.test(cleanUa)) {
        browser = "Safari";
    }

    // Operating Systems
    let os = "";
    if (/Windows NT 10\.0|Windows NT 11\.0/i.test(cleanUa)) {
        os = "Windows 11/10";
    } else if (/Windows/i.test(cleanUa)) {
        os = "Windows";
    } else if (/iPhone/i.test(cleanUa)) {
        os = "iPhone";
    } else if (/iPad/i.test(cleanUa)) {
        os = "iPad";
    } else if (/Android/i.test(cleanUa)) {
        os = "Android";
    } else if (/Mac OS X|Macintosh/i.test(cleanUa)) {
        os = "macOS";
    } else if (/Linux/i.test(cleanUa)) {
        os = "Linux";
    }

    if (!os) return browser;
    if (browser === "Web Browser") return `${os} Device`;
    return `${browser} on ${os}`;
}

export async function registerSession(opts: {
    userId: string;
    sessionId: string;
    ip?: string;
    ua?: string;
}): Promise<void> {
    if (!opts.sessionId || !opts.userId) return;
    try {
        await connectDB();
        const tokenHash = hashSession(opts.sessionId);
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
        const label = deriveDeviceLabel(opts.ua);

        // Retire any older active sessions for the exact same device/browser & IP,
        // since the browser's cookie jar was just replaced by this new session.
        if (opts.ua) {
            await Session.updateMany(
                {
                    userId: opts.userId,
                    userAgent: opts.ua,
                    ip: opts.ip || "",
                    tokenHash: { $ne: tokenHash },
                    revokedAt: null,
                },
                { $set: { revokedAt: new Date() } }
            );
        }

        await Session.findOneAndUpdate(
            { tokenHash },
            {
                $set: {
                    tokenHash,
                    userId: opts.userId,
                    userAgent: opts.ua || "",
                    ip: opts.ip || "",
                    deviceLabel: label,
                    lastSeenAt: new Date(),
                    expiresAt,
                    revokedAt: null,
                },
            },
            { upsert: true }
        );
    } catch (e) {
        console.error("[sessions] register failed:", e);
    }
}

export async function sessionActive(tokenHash?: string | null): Promise<boolean> {
    if (!tokenHash) return false;
    try {
        await connectDB();
        const now = new Date();
        const s = await Session.findOne({
            tokenHash,
            revokedAt: null,
            expiresAt: { $gt: now },
        })
            .select("_id lastSeenAt")
            .lean();
        if (!s) return false;

        // Throttle updating lastSeenAt: only update if last update was > 2 minutes ago
        const lastSeenTime = s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : 0;
        if (now.getTime() - lastSeenTime > 120_000) {
            Session.updateOne({ _id: s._id }, { $set: { lastSeenAt: now } }).catch(() => {});
        }

        return true;
    } catch (e) {
        console.error("[sessions] validation failed:", e);
        // F-002: Fail-closed on database error so revoked sessions are not granted access
        return false;
    }
}

export async function revokeSessionById(userId: string, id: string): Promise<boolean> {
    await connectDB();
    const res = await Session.updateOne({ _id: id, userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    return res.modifiedCount > 0;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
    try {
        await connectDB();
        await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    } catch (e) {
        console.error("[sessions] revoke-all failed:", e);
    }
}

export async function revokeOtherUserSessions(userId: string, currentTokenHash: string): Promise<number> {
    if (!userId || !currentTokenHash) return 0;
    try {
        await connectDB();
        const res = await Session.updateMany(
            {
                userId,
                tokenHash: { $ne: currentTokenHash },
                revokedAt: null,
            },
            { $set: { revokedAt: new Date() } }
        );
        return res.modifiedCount;
    } catch (e) {
        console.error("[sessions] revoke-others failed:", e);
        return 0;
    }
}

export async function listUserSessions(userId: string, currentTokenHash?: string | null) {
    await connectDB();
    const now = new Date();
    const rows = await Session.find({
        userId,
        revokedAt: null,
        expiresAt: { $gt: now },
    })
        .sort({ lastSeenAt: -1 })
        .lean();

    // Deduplicate: If there are multiple active rows from past logins with the same device signature,
    // keep the current active session or the latest one, and retire the stale duplicates in DB.
    const seenDevices = new Set<string>();
    const validRows: typeof rows = [];
    const staleIds: any[] = [];

    // Prioritize current session first
    const currentSession = currentTokenHash ? rows.find((r) => r.tokenHash === currentTokenHash) : null;
    if (currentSession) {
        validRows.push(currentSession);
        const key = `${currentSession.userAgent || ""}__${currentSession.ip || ""}`;
        seenDevices.add(key);
    }

    for (const r of rows) {
        if (currentSession && String(r._id) === String(currentSession._id)) continue;
        const key = `${r.userAgent || ""}__${r.ip || ""}`;
        if (!seenDevices.has(key)) {
            validRows.push(r);
            seenDevices.add(key);
        } else {
            // Older orphaned session on same device/ip
            staleIds.push(r._id);
        }
    }

    // Automatically retire stale orphaned duplicates in the background
    if (staleIds.length > 0) {
        Session.updateMany({ _id: { $in: staleIds } }, { $set: { revokedAt: now } }).catch(() => {});
    }

    return validRows.map((r) => ({
        id: String(r._id),
        deviceLabel: deriveDeviceLabel(r.userAgent),
        userAgent: r.userAgent,
        ip: formatIp(r.ip),
        lastSeenAt: r.lastSeenAt,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        current: !!currentTokenHash && r.tokenHash === currentTokenHash,
    }));
}
