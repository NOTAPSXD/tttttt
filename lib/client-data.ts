import { connectDB, Server, User } from "@/lib/db";
import { getAdapterForServer } from "@/lib/providers";
import type { ProviderState } from "@/lib/providers";
import {
    ClientAccount,
    ClientDashboardData,
    ClientServer,
    ClientTask,
    TrafficSummary,
    clampPercent,
    detectOs,
    flagForCountry,
    locationLabel,
    parseCpuCores,
    parseCpuPercent,
    parseMemUsedMb,
    parseMemoryMb,
    resolveServerStatus,
} from "@/lib/clientserver";

// ── Account ──────────────────────────────────────────────────

export async function fetchClientUser(userId: string): Promise<ClientAccount | null> {
    try {
        await connectDB();
        const user = await User.findById(userId)
            .select("name email role verified verifiedIp lastLogin createdAt")
            .lean();

        if (!user) return null;

        return {
            id: String(user._id),
            name: user.name || "User",
            email: user.email || "",
            role: user.role || "CLIENT",
            verified: !!user.verified,
            lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null,
            createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
            twoFactorEnabled: false, // 2FA lands in Phase C
        };
    } catch (e) {
        console.error("fetchClientUser error:", e);
        return null;
    }
}

// ── Provider payload: raw (legacy UI) + normalized state ─────────

export interface ServerProviderPayload {
    raw: Record<string, any> | null;
    state: ProviderState | null;
}

export async function buildServerProviderPayload(db: Record<string, any>): Promise<ServerProviderPayload> {
    const adapter = getAdapterForServer(db);
    const [raw, state] = await Promise.all([
        adapter.getUpstream(db.providerServerId).catch(() => null),
        adapter.getState(db.providerServerId).catch(() => null),
    ]);
    return { raw, state };
}

// ── Low-level server mapping ─────────────────────────────────

function mapServer(db: Record<string, any>, payload: ServerProviderPayload): ClientServer {
    const { raw, state } = payload;
    const status = resolveServerStatus({
        providerType: db.providerType,
        state,
        cachedStatus: db.status,
        suspended: !!db.suspended,
    });
    const os = detectOs(raw?.name || db.name, raw?.hostname || db.hostname);

    const node = raw?.node || null;
    const city = node?.location?.city || node?.city || null;
    const country = node?.location?.country || node?.country || null;

    const cpuCores = parseCpuCores(raw?.cpu ?? db.cpu);
    const memoryTotalMb = parseMemoryMb(raw?.memory ?? db.ram);

    return {
        id: String(db._id),
        virtfusionId: db.providerServerId,
        providerType: db.providerType || "virtfusion",
        name: db.name || raw?.name || "Unnamed server",
        hostname: raw?.hostname || db.hostname || null,
        ip: db.ip || raw?.network?.primary?.ipv4?.[0]?.address || null,
        location: locationLabel(city, country),
        locationFlag: flagForCountry(country),
        status: status.label,
        tone: status.tone,
        suspended: !!db.suspended,
        cpuCores,
        memoryTotalMb,
        capacity: raw?.storage?.[0]?.capacity || null,
        os,
        bookmarked: !!db.bookmarked,
        created: db.createdAt ? new Date(db.createdAt).toISOString() : null,
        renewal: db.renewalDate ? new Date(db.renewalDate).toISOString() : null,
        state: state
            ? {
                status: state.status,
                running: state.running,
                cpuPct: state.cpuPct,
                memUsedMb: state.memUsedMb,
                traffic: { rx: state.traffic.rx, tx: state.traffic.tx, total: state.traffic.total },
            }
            : null,
        vfDetails: raw,
    };
}

// ── Task mapping (defensive against provider response shapes) ─

function mapTask(raw: any, server: ClientServer): ClientTask | null {
    if (!raw) return null;
    const r: Record<string, any> = typeof raw === "object" ? raw : { reference: raw };

    const type = String(r.type || r.name || r.reference || r.command || "Server task");
    const status = String(r.status || "unknown").toLowerCase();
    const requestedAt = r.createdAt || r.created || r.startedAt || r.timing?.startedAt || null;
    const completedAt = r.completedAt || r.finishedAt || r.timing?.completedAt || null;

    let duration: number | null =
        r.timing?.duration ??
        r.duration ??
        (typeof r.durationSeconds === "number" ? r.durationSeconds : null);

    if (duration == null && requestedAt && completedAt) {
        duration = (new Date(completedAt).getTime() - new Date(requestedAt).getTime()) / 1000;
    }

    return {
        id: String(r.id || r.reference || `${server.id}-${type}-${requestedAt || Math.random().toString(36)}`),
        serverId: server.id,
        serverName: server.name,
        type,
        status,
        requestedAt: requestedAt ? new Date(requestedAt).toISOString() : null,
        durationSeconds: duration,
    };
}

export async function fetchClientTasks(servers: ClientServer[]): Promise<ClientTask[]> {
    const batches = await Promise.all(
        servers.map(async (server) => {
            if (server.virtfusionId == null) return [] as ClientTask[];
            try {
                const adapter = getAdapterForServer({ providerType: server.providerType ?? "virtfusion" });
                const data = await adapter.getTasks(server.virtfusionId);
                const list = Array.isArray(data) ? data : [];
                return list.map((t: any) => mapTask(t, server)).filter(Boolean) as ClientTask[];
            } catch (e) {
                return [] as ClientTask[];
            }
        }),
    );
    return batches.flat().sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
}

// ── Traffic summary ──────────────────────────────────────────

function buildTrafficSummary(servers: ClientServer[]): TrafficSummary {
    let rx = 0;
    let tx = 0;
    let total = 0;
    let allowanceGb: number | null = null;

    servers.forEach((s) => {
        rx += s.state?.traffic?.rx || 0;
        tx += s.state?.traffic?.tx || 0;
        total += s.state?.traffic?.total || 0;
        const limit = s.vfDetails?.network?.primary?.limit;
        if (limit && allowanceGb == null) {
            const str = String(limit).toUpperCase();
            const num = parseFloat(str);
            if (!Number.isNaN(num)) {
                allowanceGb = str.includes("TB") ? num * 1024 : num;
            }
        }
    });

    const usedGb = total / (1024 * 1024 * 1024);
    return {
        rxGb: rx / (1024 * 1024 * 1024),
        txGb: tx / (1024 * 1024 * 1024),
        totalGb: usedGb,
        allowanceGb,
        percentUsed: allowanceGb ? clampPercent((usedGb / allowanceGb) * 100) : 0,
    };
}

// ── Main aggregation ─────────────────────────────────────────

export async function fetchClientDashboardData(userId: string): Promise<ClientDashboardData | null> {
    try {
        await connectDB();

        const [dbServers, user] = await Promise.all([
            Server.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
            fetchClientUser(userId),
        ]);

        if (!user) return null;

        const payloads = await Promise.all(dbServers.map((s: any) => buildServerProviderPayload(s)));

        const servers = dbServers.map((doc: any, i: number) => mapServer(doc, payloads[i]));

        let totalCpu = 0;
        let totalRamMb = 0;
        let runningServers = 0;

        servers.forEach((s) => {
            totalCpu += s.cpuCores;
            totalRamMb += s.memoryTotalMb;
            if (s.state?.running) runningServers++;
        });

        const tasks = await fetchClientTasks(servers);
        const traffic = buildTrafficSummary(servers);

        return {
            servers,
            totalCpu,
            totalRamMb,
            runningServers,
            user,
            traffic,
            tasks,
        };
    } catch (e) {
        console.error("fetchClientDashboardData error:", e);
        return null;
    }
}

// ── Single-server record for the detail page ─────────────────

export async function fetchClientServer(docId: string, userId: string) {
    await connectDB();
    const doc: any = await Server.findOne({ _id: docId, ownerId: userId }).lean();
    if (!doc) return null;
    const payload = await buildServerProviderPayload(doc);
    const initial = mapServer(doc, payload);
    return { initial, providerServerId: doc.providerServerId!, providerType: doc.providerType! };
}

export { mapServer };