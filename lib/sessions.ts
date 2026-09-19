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

export function deriveDeviceLabel(ua?: string): string {
    if (!ua) return "Unknown device";
    const browser =
        /Edg\//i.test(ua) ? "Edge" :
        /OPR\//i.test(ua) ? "Opera" :
        /Chrome\//i.test(ua) ? "Chrome" :
        /Firefox\//i.test(ua) ? "Firefox" :
        /Safari\//i.test(ua) ? "Safari" :
        "Browser";
    const os =
        /Windows/i.test(ua) ? "Windows" :
        /Mac OS X/i.test(ua) ? "macOS" :
        /Android/i.test(ua) ? "Android" :
        /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
        /Linux/i.test(ua) ? "Linux" :
        "OS";
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
        await Session.findOneAndUpdate(
            { tokenHash },
            {
                $set: {
                    tokenHash,
                    userId: opts.userId,
                    userAgent: opts.ua || "",
                    ip: opts.ip || "",
                    deviceLabel: deriveDeviceLabel(opts.ua),
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
        const s = await Session.findOne({ tokenHash, revokedAt: null }).select("_id").lean();
        return !!s;
    } catch (e) {
        console.error("[sessions] validation failed:", e);
        return true;
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

export async function listUserSessions(userId: string, currentTokenHash?: string | null) {
    await connectDB();
    const rows = await Session.find({ userId, revokedAt: null }).sort({ lastSeenAt: -1 }).lean();
    return rows.map((r) => ({
        id: String(r._id),
        deviceLabel: r.deviceLabel || deriveDeviceLabel(r.userAgent),
        userAgent: r.userAgent,
        ip: r.ip,
        lastSeenAt: r.lastSeenAt,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        current: !!currentTokenHash && r.tokenHash === currentTokenHash,
    }));
}