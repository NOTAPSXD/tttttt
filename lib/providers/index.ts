import { ProviderAdapter, ProviderCapabilities, ProviderType } from './types';
import { virtfusionAdapter } from './virtfusion';
import { manualAdapter } from './manual';

export * from './types';
export { virtfusionAdapter } from './virtfusion';
export { manualAdapter } from './manual';

const capabilitiesCache = new Map<ProviderType, ProviderCapabilities>();

/** Capability probe, cached 15 minutes so the boot-time probe stays cheap. */
export async function getCapabilities(providerType: ProviderType = 'virtfusion'): Promise<ProviderCapabilities> {
    const hit = capabilitiesCache.get(providerType);
    if (hit) return hit;
    const adapter = getAdapter(providerType);
    const caps = await adapter.probeCapabilities();
    capabilitiesCache.set(providerType, caps);
    return caps;
}

export function getAdapter(providerType?: string | null): ProviderAdapter {
    return String(providerType || 'virtfusion') === 'manual' ? manualAdapter : virtfusionAdapter;
}

/** Select the adapter for a DB server record. */
export function getAdapterForServer(server: {
    providerType?: string | null;
}): ProviderAdapter {
    return getAdapter(server?.providerType);
}

/**
 * Best-effort classification of a server into provider type.
 * Used by the migration for legacy records that predate providerType.
 */
const AWS_INSTANCE_PATTERN = /(t2|t3|t3a|t4g|m5|m6i|m7i|c5|c6i|c7i|r5|r6i|r7i|z1d|i3|i4i|g5|p3|p4)\.\w+/i;
const AWS_INSTANCE_ID_PATTERN = /^i-[a-z0-9]{8,17}$/;

export function guessProviderType(value: {
    providerServerId?: string | null;
    virtfusionId?: string | null;
    name?: string | null;
    cpu?: string | null;
    ram?: string | null;
}): ProviderType {
    const id = String(value.providerServerId ?? value.virtfusionId ?? '');
    const name = `${value.name || ''} ${value.cpu || ''} ${value.ram || ''}`;

    if (AWS_INSTANCE_ID_PATTERN.test(id)) return 'manual';
    if (AWS_INSTANCE_PATTERN.test(name)) return 'manual';
    // VirtFusion server ids are numeric.
    if (/^\d+$/.test(id)) return 'virtfusion';
    if (id) return 'manual';
    // Records created from the orphan/unassigned flow default to VirtFusion.
    return 'virtfusion';
}