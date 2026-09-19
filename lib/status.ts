import type { ServerStatus, ServerTone, ServerStatusLabel } from '@/lib/clientserver';
import type { ProviderState, ProviderType } from '@/lib/providers/types';

export interface StatusSource {
    providerType?: ProviderType | string | null;
    /** Live provider data. null means the provider did not return live state. */
    state?: ProviderState | null;
    /** Provider call failed / feature unsupported for this server type. */
    providerUnavailable?: boolean;
    /** Last-known status cached on the Server record. */
    cachedStatus?: string | null;
    suspended?: boolean;
}

const KNOWN_STATES: ServerStatusLabel[] = [
    'RUNNING',
    'STOPPED',
    'OFFLINE',
    'SUSPENDED',
    'PROVISIONING',
    'UNKNOWN',
];

const toneForStatus = (label: ServerStatusLabel): ServerTone => {
    switch (label) {
        case 'RUNNING':
            return 'success';
        case 'STOPPED':
        case 'OFFLINE':
            return 'danger';
        case 'SUSPENDED':
            return 'warning';
        case 'PROVISIONING':
            return 'info';
        default:
            return 'muted';
    }
};

const resolveCached = (cachedStatus: string | null | undefined): ServerStatus | null => {
    if (!cachedStatus) return null;
    const normalized = String(cachedStatus).toUpperCase() as ServerStatusLabel;
    if (!KNOWN_STATES.includes(normalized)) return null;
    return { label: normalized, tone: toneForStatus(normalized) };
};

/**
 * Single source of truth for a server's displayed status.
 * Provider state wins; the DB cached status is the fallback; "—" only when
 * neither has anything meaningful (resolver returns UNKNOWN).
 */
export function resolveServerStatus(source: StatusSource): ServerStatus {
    if (source.suspended) {
        return { label: 'SUSPENDED', tone: 'warning' };
    }

    const isManual = String(source.providerType || 'virtfusion') === 'manual';

    if (source.state) {
        if (source.state.running === true) {
            return { label: 'RUNNING', tone: 'success' };
        }
        if (isManual) {
            // Health-check adapters only know online/offline.
            return { label: 'OFFLINE', tone: 'danger' };
        }
        const raw = String(source.state.status || source.cachedStatus || '').toUpperCase();
        if (raw === 'RUNNING') return { label: 'RUNNING', tone: 'success' };
        if (raw === 'STOPPED' || raw === 'OFF' || raw === 'SHUTDOWN' || raw === 'POWERED OFF') {
            return { label: 'STOPPED', tone: 'danger' };
        }
        if (raw === 'INSTALLING' || raw === 'PROVISIONING' || raw === 'REBUILDING' || raw === 'SUSPENDED') {
            return {
                label: raw === 'SUSPENDED' ? 'SUSPENDED' : 'PROVISIONING',
                tone: raw === 'SUSPENDED' ? 'warning' : 'info',
            };
        }
        return { label: 'UNKNOWN', tone: 'muted' };
    }

    if (isManual && source.providerUnavailable !== false) {
        // A manual host we cannot reach right now.
        return { label: 'OFFLINE', tone: 'danger' };
    }

    const cached = resolveCached(source.cachedStatus);
    if (cached) return cached;

    return { label: 'UNKNOWN', tone: 'muted' };
}

/** Normalize the legacy raw VirtFusion payload into a normalized ProviderState. */
export function providerStateFromVfRaw(raw: Record<string, any> | null | undefined): ProviderState | null {
    if (!raw?.state) return null;
    const s = raw.state;
    const memStr = String(s.memory || '').toUpperCase();
    let memUsedMb = 0;
    if (memStr.includes('%')) {
        const pct = parseFloat(memStr);
        const totalMb = parseMemoryMb(String(raw.memory || ''));
        memUsedMb = Number.isFinite(pct) ? Math.round((pct / 100) * totalMb) : 0;
    } else {
        const num = parseFloat(memStr);
        if (Number.isFinite(num)) memUsedMb = memStr.includes('GB') ? num * 1024 : memStr.includes('TB') ? num * 1024 * 1024 : num;
    }

    const cpuRaw = String(s.cpu || '');
    const cpuPct = parseFloat(cpuRaw.replace('%', '').trim());
    const traffic = s.network?.primary?.traffic || { rx: 0, tx: 0, total: 0 };

    return {
        status: String(s.status || ''),
        running: !!s.running,
        cpuPct: Number.isFinite(cpuPct) ? Math.max(0, Math.min(100, cpuPct)) : 0,
        memUsedMb,
        memTotalMb: parseMemoryMb(String(raw.memory || '')),
        traffic: { rx: Number(traffic.rx || 0), tx: Number(traffic.tx || 0), total: Number(traffic.total || 0) },
    };
}

function parseMemoryMb(value: string): number {
    const str = String(value).toUpperCase();
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return 0;
    if (str.includes('TB')) return Math.round(num * 1024 * 1024);
    if (str.includes('GB')) return Math.round(num * 1024);
    return Math.round(num);
}