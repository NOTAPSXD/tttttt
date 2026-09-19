import net from 'net';
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
} from './types';
import { connectDB, Server } from '@/lib/db';

/**
 * Health-check adapter for machines that have no provider API (e.g. AWS-style
 * instance types such as t2.xlarge / z1d.2xlarge). Status is derived from
 * TCP reachability with a short in-process cache so polling does not hammer
 * the host. Everything else is unsupported and hidden by capabilities.
 */

const PROBE_PORTS = [22, 80, 443, 8080, 8443];
const PROBE_TIMEOUT_MS = 2000;
const RESULT_CACHE_MS = 10_000;

const stateCache = new Map<string, { at: number; state: ProviderState | null }>();

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
    liveStats: false, power: false, rebuild: false, resetPassword: false, rename: false,
    rdns: false, isoMount: false, backups: false, backupsRestore: false, osList: false,
    storageDetail: false, networkInfo: false, vnc: false, tasks: false, detail: false,
    upstreamList: false,
};

const tcpReachable = (ip: string): Promise<boolean> =>
    new Promise((resolve) => {
        const probe = (port: number) =>
            new Promise<boolean>((res) => {
                const socket = net.connect({ host: ip, port, timeout: PROBE_TIMEOUT_MS });
                socket.once('connect', () => {
                    socket.destroy();
                    res(true);
                });
                socket.once('error', () => {
                    socket.destroy();
                    res(false);
                });
                socket.once('timeout', () => {
                    socket.destroy();
                    res(false);
                });
            });

        Promise.all(PROBE_PORTS.map(probe))
            .then((results) => resolve(results.some(Boolean)))
            .catch(() => resolve(false));
    });

const cached = (serverId: string): ProviderState | null | undefined => {
    const entry = stateCache.get(serverId);
    if (!entry) return undefined;
    if (Date.now() - entry.at > RESULT_CACHE_MS) {
        stateCache.delete(serverId);
        return undefined;
    }
    return entry.state;
};

export class ManualAdapter implements ProviderAdapter {
    readonly providerType = 'manual' as const;

    async getCapabilities(): Promise<ProviderCapabilities> {
        return DEFAULT_CAPABILITIES;
    }

    async probeCapabilities(): Promise<ProviderCapabilities> {
        return DEFAULT_CAPABILITIES;
    }

    private async serverDoc(serverId: string) {
        await connectDB();
        return Server.findOne({ providerServerId: serverId }).lean();
    }

    async getState(serverId: string): Promise<ProviderState | null> {
        const hit = cached(serverId);
        if (hit !== undefined) return hit;

        const doc = await this.serverDoc(serverId);
        const ip = doc?.ip;
        if (!ip) {
            stateCache.set(serverId, { at: Date.now(), state: null });
            return null;
        }

        const reachable = await tcpReachable(ip);
        const state: ProviderState = reachable
            ? {
                status: 'online',
                running: true,
                cpuPct: 0,
                memUsedMb: 0,
                memTotalMb: 0,
                traffic: { rx: 0, tx: 0, total: 0 },
            }
            : {
                status: 'offline',
                running: false,
                cpuPct: 0,
                memUsedMb: 0,
                memTotalMb: 0,
                traffic: { rx: 0, tx: 0, total: 0 },
            };
        stateCache.set(serverId, { at: Date.now(), state });
        return state;
    }

    listSummary(): Promise<ProviderServerSummary[]> {
        return Promise.resolve([]);
    }

    listUpstream(): Promise<any[]> {
        return Promise.resolve([]);
    }

    getUpstream(_id: string): Promise<any | null> {
        return Promise.resolve(null);
    }

    async getDetail(_serverId: string): Promise<ProviderDetail | null> {
        const doc = await this.serverDoc(_serverId);
        if (!doc) return null;
        return {
            id: doc.providerServerId,
            name: doc.name,
            hostname: doc.hostname ?? null,
            memory: doc.ram ?? null,
            cpu: doc.cpu ?? null,
            os: null,
            planLabel: doc.planLabel ?? null,
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
            ipv4: doc.ip ? [doc.ip] : [],
            bandwidthLimitGb: null,
            disks: [],
            state: null,
            raw: null,
        };
    }

    power(_serverId: string, _action: PowerAction): Promise<ServerPowerResult> {
        unsupported('Power actions are not available for this infrastructure.');
    }

    resetPassword(_serverId: string, _opts?: { user?: string }): Promise<ResetPasswordResult> {
        unsupported('Password resets are not available for this infrastructure.');
    }

    getVNC(_serverId: string): Promise<{ url: string } | null> {
        unsupported('A console is not available for this infrastructure.');
    }

    getTasks(_serverId: string): Promise<any[]> {
        unsupported('Task tracking is not available for this infrastructure.');
    }

    getBackups(_serverId: string): Promise<ServerBackupRef[]> {
        unsupported('Backups are not available for this infrastructure.');
    }

    createBackup(_serverId: string): Promise<ServerPowerResult> {
        unsupported('Backups are not available for this infrastructure.');
    }

    restoreBackup(_serverId: string, _backupId: string): Promise<ServerPowerResult> {
        unsupported('Backups are not available for this infrastructure.');
    }

    deleteBackup(_serverId: string, _backupId: string): Promise<ServerPowerResult> {
        unsupported('Backups are not available for this infrastructure.');
    }

    listMedia(_serverId: string): Promise<any[]> {
        unsupported('Media management is not available for this infrastructure.');
    }

    getStorage(_serverId: string): Promise<any[]> {
        unsupported('Storage management is not available for this infrastructure.');
    }

    rebuild(_serverId: string, _opts: { osId: string; hostname?: string; password?: string }): Promise<ServerPowerResult> {
        unsupported('Rebuilding is not available for this infrastructure.');
    }

    setRdns(_serverId: string, _ip: string, _ptr: string): Promise<ServerPowerResult> {
        unsupported('rDNS management is not available for this infrastructure.');
    }

    mountIso(_serverId: string, _isoId: string): Promise<ServerPowerResult> {
        unsupported('ISO mounting is not available for this infrastructure.');
    }

    unmountIso(_serverId: string): Promise<ServerPowerResult> {
        unsupported('ISO mounting is not available for this infrastructure.');
    }
}

export const manualAdapter = new ManualAdapter();