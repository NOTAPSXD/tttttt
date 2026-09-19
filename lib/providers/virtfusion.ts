import axios, { AxiosInstance } from "axios";
import {
    ProviderAdapter,
    ProviderCapabilities,
    ProviderDetail,
    ProviderError,
    ProviderServerSummary,
    ProviderState,
    PowerAction,
    ResetPasswordResult,
    ServerBackupRef,
    ServerPowerResult,
    unsupported,
} from "./types";

const API_URL = process.env.VIRTFUSION_API_URL;
const API_TOKEN = process.env.VIRTFUSION_API_TOKEN;

interface VFState {
    status?: string;
    running?: boolean;
    cpu?: string;
    memory?: string;
    network?: { primary?: { traffic?: { rx?: number; tx?: number; total?: number } } };
}

interface VFServer {
    id: string;
    name: string;
    hostname?: string | null;
    memory?: string;
    cpu?: string;
    state?: VFState;
    storage?: { id?: string; primary?: boolean; capacity?: string }[];
    network?: { primary?: { ipv4?: { address?: string; gateway?: string; netmask?: string }[]; limit?: string } };
    os?: string;
    template?: { name?: string };
    createdAt?: string;
    node?: { location?: { city?: string; country?: string } } | null;
}

const parseGb = (value: string | undefined | null): number | null => {
    if (!value) return null;
    const str = String(value).toUpperCase();
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return null;
    return str.includes('TB') ? num * 1024 : num;
};

const memoryMb = (value: string | undefined | null): number => {
    if (!value) return 0;
    const str = String(value).toUpperCase();
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return 0;
    return str.includes('TB') ? num * 1024 * 1024 : str.includes('GB') ? num * 1024 : num;
};

export class VirtFusionAdapter implements ProviderAdapter {
    readonly providerType = 'virtfusion' as const;
    private client: AxiosInstance | null = null;
    private capabilities: ProviderCapabilities | null = null;
    private capabilitiesAt = 0;

    constructor() {
        if (!API_URL || !API_TOKEN) {
            console.error('[providers:virtfusion] VIRTFUSION_API_URL / VIRTFUSION_API_TOKEN missing');
            return;
        }
        this.client = axios.create({
            baseURL: API_URL,
            timeout: 15000,
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    }

    private configured(): boolean {
        if (!this.client) {
            throw new ProviderError({
                code: 'UNKNOWN',
                message: 'The provider connection is not configured.',
                retryable: false,
            });
        }
        return true;
    }

    private async request<T>(config: { method: 'get' | 'post' | 'delete'; url: string; data?: unknown; retries?: number }): Promise<T> {
        this.configured();
        const maxRetries = config.retries ?? 2;
        let attempt = 0;
        while (true) {
            try {
                const res = await this.client!.request<any>({ method: config.method, url: config.url, data: config.data });
                return res.data as T;
            } catch (e: any) {
                const status = e?.response?.status;
                const retryable = !status || status >= 500 || status === 429;
                if (attempt < maxRetries && retryable) {
                    attempt += 1;
                    await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
                    continue;
                }
                throw this.mapError(e);
            }
        }
    }

    private mapError(e: any): ProviderError {
        const status = e?.response?.status;
        const raw = e?.response?.data;
        const rawMessage =
            raw?.errors?.[0] || raw?.error?.message || raw?.message || e?.message || 'Provider request failed';
        const rawString = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
        switch (status) {
            case 401:
                return new ProviderError({ code: 'UNAUTHORIZED', message: 'The provider rejected access credentials.', retryable: false, raw: rawString });
            case 403:
                return new ProviderError({ code: 'FORBIDDEN', message: 'The provider rejected access credentials.', retryable: false, raw: rawString });
            case 404:
                return new ProviderError({ code: 'NOT_FOUND', message: 'The requested asset was not found on the provider.', retryable: false, raw: rawString });
            case 429:
                return new ProviderError({ code: 'RATE_LIMITED', message: 'The provider is rate limiting requests. Please wait a moment.', retryable: true, raw: rawString });
            default:
                if (e?.code === 'ECONNABORTED') {
                    return new ProviderError({ code: 'TIMEOUT', message: 'The provider took too long to respond.', retryable: true, raw: rawString });
                }
                if (status && status >= 500) {
                    return new ProviderError({ code: 'NETWORK', message: 'The provider had a temporary problem.', retryable: true, raw: rawString });
                }
                return new ProviderError({ code: 'UNKNOWN', message: 'An unexpected provider error occurred.', retryable: true, raw: rawString });
        }
    }

    // ── Capabilities ──────────────────────────────────────────

    async probeCapabilities(): Promise<ProviderCapabilities> {
        const now = Date.now();
        if (this.capabilities && now - this.capabilitiesAt < 15 * 60 * 1000) {
            return this.capabilities;
        }
        const fallback: ProviderCapabilities = {
            liveStats: false, power: false, rebuild: false, resetPassword: false, rename: false,
            rdns: false, isoMount: false, backups: false, backupsRestore: false, osList: false,
            storageDetail: false, networkInfo: false, vnc: false, tasks: false, detail: false,
            upstreamList: false,
        };
        try {
            const list = await this.request<{ data?: VFServer[] }>({ method: 'get', url: '/server?results=5', retries: 1 });
            const hasList = Array.isArray(list?.data);
            this.capabilities = hasList
                ? { ...fallback, upstreamList: true, detail: true, liveStats: true, power: true, resetPassword: true, rename: true, tasks: true, backups: false, backupsRestore: false, osList: true, storageDetail: true, networkInfo: true, vnc: true, isoMount: false, rdns: false, rebuild: true }
                : fallback;
        } catch (e) {
            this.capabilities = fallback;
        }
        this.capabilitiesAt = now;
        return this.capabilities;
    }

    async getCapabilities(): Promise<ProviderCapabilities> {
        return this.probeCapabilities();
    }

    // ── Catalog ───────────────────────────────────────────────

    private async fetchServers(): Promise<VFServer[]> {
        const res = await this.request<{ data?: VFServer[] }>({ method: 'get', url: '/server?results=100', retries: 2 });
        return Array.isArray(res?.data) ? res.data : [];
    }

    private async fetchServer(serverId: string): Promise<VFServer | null> {
        try {
            const res = await this.request<{ data?: VFServer }>({ method: 'get', url: `/server/${serverId}?state=true`, retries: 2 });
            return res?.data || null;
        } catch (e) {
            if (e instanceof ProviderError && e.code === 'NOT_FOUND') return null;
            throw e;
        }
    }

    async listUpstream(): Promise<any[]> {
        return this.fetchServers();
    }

    async getUpstream(id: string): Promise<any | null> {
        return this.fetchServer(id);
    }

    // ── Normalized mapping ────────────────────────────────────

    async listSummary(): Promise<ProviderServerSummary[]> {
        const servers = await this.fetchServers();
        return servers.map((s) => ({
            id: s.id,
            name: s.name,
            memory: s.memory ?? null,
            cpu: s.cpu ?? null,
            state: s.state ? { status: String(s.state.status || ''), running: !!s.state.running } : null,
            ip: s.network?.primary?.ipv4?.[0]?.address ?? null,
        }));
    }

    async getDetail(serverId: string): Promise<ProviderDetail | null> {
        const raw = await this.fetchServer(serverId);
        if (!raw) return null;
        const state = this.stateFromRaw(raw);
        return {
            id: raw.id,
            name: raw.name,
            hostname: raw.hostname ?? null,
            memory: raw.memory ?? null,
            cpu: raw.cpu ?? null,
            os: raw.os || raw.template?.name || null,
            planLabel: null,
            createdAt: raw.createdAt ?? null,
            ipv4: (raw.network?.primary?.ipv4 || []).map((n) => n.address || '').filter(Boolean),
            bandwidthLimitGb: parseGb(raw.network?.primary?.limit),
            disks: (raw.storage || []).map((d) => ({ id: d.id ?? null, primary: !!d.primary, capacity: d.capacity ?? null })),
            state,
            raw,
        };
    }

    async getState(serverId: string): Promise<ProviderState | null> {
        const detail = await this.getDetail(serverId);
        return detail?.state ?? null;
    }

    private stateFromRaw(raw: VFServer): ProviderState | null {
        if (!raw.state) return null;
        const memStr = String(raw.state.memory || '').toUpperCase();
        let memUsedMb = 0;
        if (memStr.includes('%')) {
            const pct = parseFloat(memStr);
            const total = memoryMb(raw.memory);
            memUsedMb = Number.isFinite(pct) ? Math.round((pct / 100) * total) : 0;
        } else {
            const num = parseFloat(memStr);
            if (Number.isFinite(num)) {
                memUsedMb = memStr.includes('GB') ? num * 1024 : memStr.includes('TB') ? num * 1024 * 1024 : num;
            }
        }
        const cpu = parseFloat(String(raw.state.cpu || '').replace('%', '').trim());
        const traffic = raw.state.network?.primary?.traffic || { rx: 0, tx: 0, total: 0 };
        return {
            status: String(raw.state.status || ''),
            running: !!raw.state.running,
            cpuPct: Number.isFinite(cpu) ? Math.max(0, Math.min(100, cpu)) : 0,
            memUsedMb,
            memTotalMb: memoryMb(raw.memory),
            traffic: { rx: Number(traffic.rx || 0), tx: Number(traffic.tx || 0), total: Number(traffic.total || 0) },
        };
    }

    // ── Actions ───────────────────────────────────────────────

    async power(serverId: string, action: PowerAction): Promise<ServerPowerResult> {
        try {
            await this.request({ method: 'post', url: `/server/${serverId}/${action}` });
            return { success: true, data: { action } };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }

    async resetPassword(serverId: string, opts?: { user?: string }): Promise<ResetPasswordResult> {
        const res = await this.request<{ data?: { expectedPassword?: string } }>({
            method: 'post',
            url: `/server/${serverId}/resetPassword`,
            data: { user: opts?.user || 'root' },
        });
        return { expectedPassword: res?.data?.expectedPassword };
    }

    async getVNC(serverId: string): Promise<{ url: string } | null> {
        const res = await this.request<{ data?: { wss?: { url?: string } } }>({ method: 'get', url: `/server/${serverId}/vnc` });
        const url = res?.data?.wss?.url;
        if (!url) return null;
        return { url };
    }

    async getTasks(serverId: string): Promise<any[]> {
        const res = await this.request<{ data?: any }>({ method: 'get', url: `/server/${serverId}/tasks` });
        const data = res?.data;
        return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    }

    async getBackups(serverId: string): Promise<ServerBackupRef[]> {
        const res = await this.request<{ data?: any }>({ method: 'get', url: `/server/${serverId}/backups` });
        const data = res?.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        return list
            .map((b: any) => ({
                id: String(b.id ?? b.reference ?? ''),
                name: String(b.name || b.description || 'Backup'),
                createdAt: b.createdAt ?? b.created ?? null,
                sizeBytes: typeof b.sizeBytes === 'number' ? b.sizeBytes : null,
            }))
            .filter((b: ServerBackupRef) => !!b.id);
    }

    async createBackup(serverId: string): Promise<ServerPowerResult> {
        try {
            await this.request({ method: 'post', url: `/server/${serverId}/backup` });
            return { success: true };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }

    async restoreBackup(serverId: string, backupId: string): Promise<ServerPowerResult> {
        try {
            await this.request({ method: 'post', url: `/server/${serverId}/backup/${backupId}/restore` });
            return { success: true };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }

    async deleteBackup(serverId: string, backupId: string): Promise<ServerPowerResult> {
        try {
            await this.request({ method: 'delete', url: `/server/${serverId}/backup/${backupId}` });
            return { success: true };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }

    async listMedia(serverId: string): Promise<any[]> {
        const res = await this.request<{ data?: any }>({ method: 'get', url: `/server/${serverId}/media` });
        const data = res?.data;
        return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    }

    async getStorage(serverId: string): Promise<any[]> {
        const detail = await this.getDetail(serverId);
        return detail?.disks || [];
    }

    async rebuild(serverId: string, opts: { osId: string; hostname?: string; password?: string }): Promise<ServerPowerResult> {
        try {
            await this.request({
                method: 'post',
                url: `/server/${serverId}/rebuild`,
                data: {
                    template: opts.osId,
                    hostname: opts.hostname,
                    ...(opts.password ? { rootPassword: opts.password } : {}),
                },
            });
            return { success: true };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }

    setRdns(): Promise<ServerPowerResult> {
        unsupported('rDNS management is not supported by this provider adapter.');
    }

    mountIso(serverId: string, isoId: string): Promise<ServerPowerResult> {
        return this.isoAction(serverId, isoId);
    }

    unmountIso(serverId: string): Promise<ServerPowerResult> {
        return this.isoAction(serverId, null);
    }

    private async isoAction(serverId: string, isoId: string | null): Promise<ServerPowerResult> {
        try {
            if (isoId) {
                await this.request({ method: 'post', url: `/server/${serverId}/iso`, data: { name: isoId } });
            } else {
                await this.request({ method: 'delete', url: `/server/${serverId}/iso` });
            }
            return { success: true };
        } catch (e) {
            const err = e instanceof ProviderError ? e : this.mapError(e);
            return { success: false, error: err.toPayload() };
        }
    }
}

export const virtfusionAdapter = new VirtFusionAdapter();