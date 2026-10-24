import { connectDB, Server, SyncRun, TrafficBucket } from "@/lib/db";
import { getAdapter, getCapabilities } from "@/lib/providers";
import type { ProviderServerSummary } from "@/lib/providers";
import { logAudit, ActorRef } from "@/lib/audit";
import { resolveServerStatus } from "@/lib/status";

export interface SyncCounts {
    total: number;
    mappedActive: number;
    unassigned: number;
    orphaned: number;
    manual: number;
}

export interface SyncResults {
    added: number;
    updated: number;
    missing: number;
    unassigned: number;
    orphaned: number;
    plan: string[];
    errors: string[];
}

export interface SyncOutcome {
    ok: boolean;
    status: number;
    error?: string;
    dryRun?: boolean;
    results?: SyncResults;
    runId?: string | null;
}

const dayPeriod = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Record a traffic sample into the daily (and hourly) bucket via $inc upsert.
 * Kept here so the background sync job and dashboard share one path.
 */
export async function recordTrafficSample(serverId: string, totalBytes: number, rxBytes: number, txBytes: number): Promise<void> {
    if (!serverId || totalBytes <= 0) return;
    await connectDB();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const day = dayPeriod(now);
    const hour = `${day}-${String(now.getHours()).padStart(2, "0")}`;

    await Promise.all([
        TrafficBucket.updateOne(
            { serverId, bucket: "day", period: day },
            { $setOnInsert: { start: startOfDay }, $max: { total: totalBytes, rx: rxBytes, tx: txBytes } },
            { upsert: true }
        ),
        TrafficBucket.updateOne(
            { serverId, bucket: "hour", period: hour },
            { $setOnInsert: { start: hourStart }, $max: { total: totalBytes, rx: rxBytes, tx: txBytes } },
            { upsert: true }
        ),
    ]).catch((e) => console.error("recordTrafficSample error:", e));
}

/**
 * Reconcile the provider catalog against the ownership DB.
 *  - UNASSIGNED: exists upstream, not mapped to a user.
 *  - ORPHANED: mapped in the DB but missing upstream (flagged, never auto-deleted).
 *  - DRIFT: name/IP cached fields updated where they differ.
 * Ownership is never touched here.
 */
export async function runSync(input?: { actor?: ActorRef; ip?: string; dryRun?: boolean }): Promise<SyncOutcome> {
    const dryRun = !!input?.dryRun;
    const startedAt = new Date();

    try {
        await connectDB();

        const caps = await getCapabilities("virtfusion");
        if (!caps.upstreamList) {
            return { ok: false, status: 503, error: "The provider catalog is unavailable. Check VIRTFUSION_API_URL / VIRTFUSION_API_TOKEN." };
        }

        const adapter = getAdapter("virtfusion");
        const upstream = await adapter.listSummary();
        const upstreamMap = new Map<string, ProviderServerSummary>();
        upstream.forEach((s) => upstreamMap.set(s.id, s));

        const dbServers = await Server.find({ providerType: "virtfusion" })
            .select("providerServerId name ip ipLower status providerDeletedAt lastSyncedAt planLabel")
            .lean();

        const dbMap = new Map<string, any>();
        dbServers.forEach((s) => dbMap.set(s.providerServerId, s));

        const results: SyncResults = { added: 0, updated: 0, missing: 0, unassigned: 0, orphaned: 0, plan: [], errors: [] };
        const now = new Date();
        const usableSession = !dryRun;

        const writes: Promise<void>[] = [];

        for (const sv of upstream) {
            const existing = dbMap.get(sv.id);
            const stateStatus = sv.state?.running === true ? "RUNNING" : sv.state && !sv.state.running ? "STOPPED" : null;

            if (!existing) {
                if (usableSession) {
                    writes.push(
                        Server.create({
                            providerServerId: sv.id,
                            providerType: "virtfusion",
                            name: sv.name || "Unknown server",
                            ip: sv.ip || undefined,
                            ipLower: sv.ip ? sv.ip.toLowerCase() : undefined,
                            status: stateStatus || "UNKNOWN",
                            ownerId: null,
                            lastSyncedAt: now,
                            statusCheckedAt: now,
                            providerDeletedAt: null,
                        }).then(() => undefined)
                    );
                }
                results.added += 1;
                continue;
            }

            // Drift correction on cached display fields.
            const patches: Record<string, any> = {};
            if (sv.name && sv.name !== existing.name) patches.name = sv.name;
            if (sv.ip && sv.ip !== existing.ip) {
                patches.ip = sv.ip;
                patches.ipLower = sv.ip.toLowerCase();
            }
            if (stateStatus && existing.providerDeletedAt) patches.providerDeletedAt = null;
            if (existing.providerDeletedAt) patches.providerDeletedAt = null;
            if (Object.keys(patches).length > 0) {
                results.updated += 1;
                if (usableSession) {
                    patches.lastSyncedAt = now;
                    writes.push(Server.updateOne({ _id: existing._id }, { $set: patches }).then(() => undefined));
                }
            }
        }

        // Orphaned: mapped upstream ids that no longer appear in the provider catalog.
        for (const db of dbServers) {
            if (!upstreamMap.has(db.providerServerId)) {
                if (db.providerDeletedAt == null) {
                    results.missing += 1;
                    if (usableSession) {
                        writes.push(
                            Server.updateOne(
                                { _id: db._id },
                                { $set: { providerDeletedAt: now, lastSyncedAt: now } }
                            ).then(() => undefined)
                        );
                    }
                }
            }
        }

        // Manual (health-check) hosts: refresh their last-known status.
        const manualServers = await Server.find({ providerType: "manual" })
            .select("providerServerId ip status statusCheckedAt")
            .lean();

        for (const m of manualServers) {
            try {
                const manual = getAdapter("manual");
                const state = await manual.getState(m.providerServerId);
                const label = resolveServerStatus({
                    providerType: "manual",
                    state,
                    cachedStatus: m.status,
                }).label;
                if (label !== m.status) {
                    results.updated += 1;
                    if (usableSession) {
                        writes.push(
                            Server.updateOne(
                                { _id: m._id },
                                { $set: { status: label, statusCheckedAt: now, lastSyncedAt: now } }
                            ).then(() => undefined)
                        );
                    }
                }
            } catch (e) {
                results.errors.push(`manual:${m.providerServerId}: ${(e as Error).message}`);
            }
        }

        await Promise.all(writes);

        const [unassigned, orphaned, manualCount] = await Promise.all([
            Server.countDocuments({ ownerId: null, providerDeletedAt: null }),
            Server.countDocuments({ providerDeletedAt: { $ne: null } }),
            Server.countDocuments({ providerType: "manual" }),
        ]);
        results.unassigned = unassigned;
        results.orphaned = orphaned;
        results.plan = [...upstreamMap.keys()];

        // Persist the run summary and audit it (unless dry-run).
        if (!dryRun) {
            const run = await SyncRun.create({
                startedAt,
                finishedAt: new Date(),
                status: "completed",
                added: results.added,
                updated: results.updated,
                missing: results.missing,
                unassigned,
                orphaned,
                errorsList: results.errors,
                totals: {
                    upstream: upstream.length,
                    mapped: dbServers.length,
                    manual: manualCount,
                },
            });
            await logAudit(
                input?.actor || {},
                "SYNC_RAN",
                undefined,
                undefined,
                {
                    added: results.added,
                    updated: results.updated,
                    missing: results.missing,
                    unassigned,
                    orphaned,
                },
                { ip: input?.ip }
            );
            return { ok: true, status: 200, results, runId: String(run._id) };
        }

        return { ok: true, status: 200, dryRun: true, results, runId: null };
    } catch (e) {
        const message = e instanceof Error ? e.message : "Sync failed.";
        return { ok: false, status: 500, error: message };
    }
}

export async function getSyncCounts(): Promise<SyncCounts> {
    await connectDB();
    const [total, mappedActive, unassigned, orphaned, manual] = await Promise.all([
        Server.countDocuments({ providerDeletedAt: null }),
        Server.countDocuments({ ownerId: { $ne: null }, providerDeletedAt: null }),
        Server.countDocuments({ ownerId: null, providerDeletedAt: null }),
        Server.countDocuments({ providerDeletedAt: { $ne: null } }),
        Server.countDocuments({ providerType: "manual" }),
    ]);
    return { total, mappedActive, unassigned, orphaned, manual };
}

export async function listSyncRuns(limit = 25) {
    await connectDB();
    return SyncRun.find().sort({ startedAt: -1 }).limit(limit).lean();
}