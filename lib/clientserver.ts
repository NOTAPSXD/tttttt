// ─────────────────────────────────────────────────────────────
// Client panel shared types, status resolver and formatters.
// Kept free of React/Next imports so it can be used from both
// server components, route handlers and client components.
// ─────────────────────────────────────────────────────────────

export type ServerTone = "success" | "danger" | "warning" | "muted" | "info";

export type ServerStatusLabel =
    | "RUNNING"
    | "STOPPED"
    | "OFFLINE"
    | "SUSPENDED"
    | "PROVISIONING"
    | "UNKNOWN";

export interface ServerStatus {
    label: ServerStatusLabel;
    tone: ServerTone;
}

export interface TrafficTotals {
    rx: number; // bytes
    tx: number; // bytes
    total: number; // bytes
}

export interface ServerState {
    status: string;
    running: boolean;
    cpuPct: number;
    memUsedMb: number;
    traffic: TrafficTotals;
}

export interface ClientTask {
    id: string;
    serverId: string;
    serverName: string;
    type: string;
    status: string;
    requestedAt: string | null;
    durationSeconds: number | null;
}

export interface ClientDisk {
    id: string;
    primary: boolean;
    capacity: string | null;
}

export interface ClientServer {
    id: string;
    virtfusionId: string;
    providerType?: string | null;
    name: string;
    hostname: string | null;
    ip: string | null;
    location: string | null;
    locationFlag: string;
    status: ServerStatusLabel;
    tone: ServerTone;
    suspended: boolean;
    cpuCores: number;
    memoryTotalMb: number;
    capacity: string | null;
    os: { label: string; icon: OsIcon };
    bookmarked: boolean;
    created: string | null;
    renewal: string | null;
    state: ServerState | null;
    vfDetails: Record<string, any> | null;
}

export type OsIcon =
    | "ubuntu"
    | "debian"
    | "alma"
    | "centos"
    | "rocky"
    | "fedora"
    | "windows"
    | "generic";

export interface ClientAccount {
    id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
    lastLogin: string | null;
    createdAt: string | null;
    twoFactorEnabled: boolean;
}

export interface TrafficSummary {
    rxGb: number;
    txGb: number;
    totalGb: number;
    allowanceGb: number | null;
    percentUsed: number;
}

export interface ClientDashboardData {
    servers: ClientServer[];
    totalCpu: number;
    totalRamMb: number;
    runningServers: number;
    user: ClientAccount;
    traffic: TrafficSummary;
    tasks: ClientTask[];
}

// ── Status resolution ────────────────────────────────────────

// Re-exported from lib/status.ts (single source of truth for status).
// Layout kept here so client components keep importing from "@/lib/clientserver".
export { resolveServerStatus, providerStateFromVfRaw } from "@/lib/status";
export type { StatusSource } from "@/lib/status";

// ── OS detection ─────────────────────────────────────────────

export function detectOs(name: string | null | undefined, hostname?: string | null): { label: string; icon: OsIcon } {
    const haystack = `${name || ""} ${hostname || ""}`.toLowerCase();

    if (haystack.includes("ubuntu")) return { label: "Ubuntu", icon: "ubuntu" };
    if (haystack.includes("debian")) return { label: "Debian", icon: "debian" };
    if (haystack.includes("alma")) return { label: "AlmaLinux", icon: "alma" };
    if (haystack.includes("rocky")) return { label: "Rocky Linux", icon: "rocky" };
    if (haystack.includes("centos")) return { label: "CentOS", icon: "centos" };
    if (haystack.includes("fedora")) return { label: "Fedora", icon: "fedora" };
    if (haystack.includes("windows")) return { label: "Windows", icon: "windows" };

    if (name) return { label: name, icon: "generic" };
    return { label: "Linux", icon: "generic" };
}

// ── Location / flag ──────────────────────────────────────────

const FLAG_BY_COUNTRY: Record<string, string> = {
    US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", NL: "🇳🇱", PL: "🇵🇱", FI: "🇫🇮",
    SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", IE: "🇮🇪", CH: "🇨🇭", AT: "🇦🇹", BE: "🇧🇪",
    IL: "🇮🇱", IT: "🇮🇹", ES: "🇪🇸", PT: "🇵🇹", RO: "🇷🇴", BG: "🇧🇬", CZ: "🇨🇿",
    RU: "🇷🇺", UA: "🇺🇦", TR: "🇹🇷", IN: "🇮🇳", SG: "🇸🇬", JP: "🇯🇵", KR: "🇰🇷",
    CN: "🇨🇳", HK: "🇭🇰", AU: "🇦🇺", NZ: "🇳🇿", CA: "🇨🇦", MX: "🇲🇽", BR: "🇧🇷",
    AR: "🇦🇷", ZA: "🇿🇦", AE: "🇦🇪", SA: "🇸🇦",
};

const COUNTRY_ALIASES: Record<string, string> = {
    "UNITED STATES": "US", USA: "US", "UNITED KINGDOM": "GB", UK: "GB",
    "UNITED ARAB EMIRATES": "AE", "SOUTH AFRICA": "ZA", "SOUTH KOREA": "KR",
    NETHERLANDS: "NL", SWITZERLAND: "CH", AUSTRIA: "AT", BELGIUM: "BE",
    PORTUGAL: "PT", ROMANIA: "RO", BULGARIA: "BG", "CZECH REPUBLIC": "CZ",
};

export function flagForCountry(country?: string | null): string {
    if (!country) return "🌐";
    const upper = country.trim().toUpperCase();
    if (FLAG_BY_COUNTRY[upper]) return FLAG_BY_COUNTRY[upper];
    const alias = COUNTRY_ALIASES[upper];
    if (alias && FLAG_BY_COUNTRY[alias]) return FLAG_BY_COUNTRY[alias];
    // Try a two-letter code fallback (regional indicator pairs).
    if (/^[A-Z]{2}$/.test(upper)) {
        return String.fromCodePoint(...[...upper].map((c) => 127397 + c.charCodeAt(0)));
    }
    return "🌐";
}

export function locationLabel(city?: string | null, country?: string | null): string {
    if (!city && !country) return "—";
    return [city, country].filter(Boolean).join(", ");
}

// ── Numeric parsing helpers ──────────────────────────────────

export function parseCpuCores(value: string | null | undefined): number {
    if (!value) return 0;
    const match = String(value).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

export function parseMemoryMb(value: string | null | undefined): number {
    if (!value) return 0;
    const str = String(value).toUpperCase();
    const num = parseFloat(str);
    if (Number.isNaN(num)) return 0;
    if (str.includes("GB")) return Math.round(num * 1024);
    if (str.includes("TB")) return Math.round(num * 1024 * 1024);
    return Math.round(num); // MB
}

export function parseCpuPercent(value: string | null | undefined): number {
    if (!value) return 0;
    const num = parseFloat(String(value).replace("%", "").trim());
    return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0;
}

export function parseMemUsedMb(value: string | null | undefined): number {
    if (!value) return 0;
    const str = String(value).toUpperCase();
    const num = parseFloat(str);
    if (Number.isNaN(num)) return 0;
    if (str.includes("%")) {
        return num; // caller combines with total
    }
    if (str.includes("GB")) return Math.round(num * 1024);
    if (str.includes("TB")) return Math.round(num * 1024 * 1024);
    return Math.round(num); // MB
}

// ── Formatting ───────────────────────────────────────────────

export function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return "0";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    if (kb >= 1) return `${kb.toFixed(1)} KB`;
    return `${bytes.toFixed(0)} B`;
}

export function formatGib(gib: number, decimals = 2): string {
    if (!gib || gib <= 0) return "0";
    if (gib >= 1024) return `${(gib / 1024).toFixed(2)} TB`;
    return `${gib.toFixed(decimals)} GB`;
}

export function formatDate(iso: string | null | undefined, fallback = "—"): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined, fallback = "—"): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined, fallback = "—"): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDuration(seconds: number | null | undefined): string {
    if (seconds == null || Number.isNaN(seconds)) return "—";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}