// Typed contract for the provider service layer. Server-only.

export type ProviderType = 'virtfusion' | 'manual';

export type PowerAction = 'boot' | 'shutdown' | 'restart' | 'powerOff';

export interface ProviderTraffic {
    rx: number;
    tx: number;
    total: number;
}

export interface ProviderState {
    status: string;
    running: boolean;
    cpuPct: number;
    memUsedMb: number;
    memTotalMb: number;
    traffic: ProviderTraffic;
}

export interface ProviderServerSummary {
    id: string;
    name: string;
    memory: string | null;
    cpu: string | null;
    state: { status: string; running: boolean } | null;
    ip: string | null;
}

/** Normalized detail, safe to render to clients (no provider credentials). */
export interface ProviderDetail {
    id: string;
    name: string;
    hostname: string | null;
    memory: string | null;
    cpu: string | null;
    os: string | null;
    planLabel: string | null;
    createdAt: string | null;
    ipv4: string[];
    bandwidthLimitGb: number | null;
    disks: { id: string | null; primary: boolean; capacity: string | null }[];
    state: ProviderState | null;
    /** Legacy raw payload for tools that still read VirtFusion shapes directly. */
    raw: Record<string, any> | null;
}

export interface ProviderCapabilities {
    liveStats: boolean;
    power: boolean;
    rebuild: boolean;
    resetPassword: boolean;
    rename: boolean;
    rdns: boolean;
    isoMount: boolean;
    backups: boolean;
    backupsRestore: boolean;
    osList: boolean;
    storageDetail: boolean;
    networkInfo: boolean;
    vnc: boolean;
    tasks: boolean;
    detail: boolean;
    upstreamList: boolean; // can enumerate the provider catalog (sync engine)
}

export type ProviderErrorCode =
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'RATE_LIMITED'
    | 'UNSUPPORTED'
    | 'TIMEOUT'
    | 'NETWORK'
    | 'UNKNOWN';

export interface ProviderErrorPayload {
    code: ProviderErrorCode;
    message: string;
    retryable?: boolean;
    /** Raw message, shown to admins only. */
    raw?: string;
}

export class ProviderError extends Error {
    readonly code: ProviderErrorCode;
    readonly retryable: boolean;
    readonly raw?: string;

    constructor(payload: ProviderErrorPayload) {
        super(payload.message);
        this.name = 'ProviderError';
        this.code = payload.code;
        this.retryable = !!payload.retryable;
        this.raw = payload.raw;
    }

    toPayload(): ProviderErrorPayload {
        return { code: this.code, message: this.message, retryable: this.retryable, raw: this.raw };
    }
}

export interface ServerPowerResult {
    success: boolean;
    error?: ProviderErrorPayload;
    data?: unknown;
}

export interface ServerBackupRef {
    id: string;
    name: string;
    createdAt: string | null;
    sizeBytes: number | null;
}

export interface ResetPasswordResult {
    expectedPassword?: string;
}

export interface ProviderAdapter {
    readonly providerType: ProviderType;
    getCapabilities(): Promise<ProviderCapabilities>;
    probeCapabilities(): Promise<ProviderCapabilities>;
    /** Enumerate the upstream catalog (empty for adapters without a catalog). */
    listSummary(): Promise<ProviderServerSummary[]>;
    /** Raw upstream catalog entries (VirtFusion shape) for legacy tooling. */
    listUpstream(): Promise<any[]>;
    getUpstream(id: string): Promise<any | null>;
    getDetail(serverId: string): Promise<ProviderDetail | null>;
    getState(serverId: string): Promise<ProviderState | null>;
    power(serverId: string, action: PowerAction): Promise<ServerPowerResult>;
    resetPassword(serverId: string, opts?: { user?: string }): Promise<ResetPasswordResult>;
    getVNC(serverId: string): Promise<{ url: string } | null>;
    getTasks(serverId: string): Promise<any[]>;
    getBackups(serverId: string): Promise<ServerBackupRef[]>;
    createBackup(serverId: string): Promise<ServerPowerResult>;
    restoreBackup(serverId: string, backupId: string): Promise<ServerPowerResult>;
    deleteBackup(serverId: string, backupId: string): Promise<ServerPowerResult>;
    listMedia(serverId: string): Promise<any[]>;
    getStorage(serverId: string): Promise<any[]>;
    rebuild(serverId: string, opts: { osId: string; hostname?: string; password?: string }): Promise<ServerPowerResult>;
    setRdns(serverId: string, ip: string, ptr: string): Promise<ServerPowerResult>;
    mountIso(serverId: string, isoId: string): Promise<ServerPowerResult>;
    unmountIso(serverId: string): Promise<ServerPowerResult>;
}

export function unsupported(message = 'This feature is not available for this infrastructure.'): never {
    throw new ProviderError({ code: 'UNSUPPORTED', message, retryable: false });
}