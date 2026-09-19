import type { UserRole } from '@/lib/db';

// Role hierarchy. "CLIENT" is the legacy stored value for end users.
export const ROLE_RANK: Record<UserRole, number> = {
    CLIENT: 0,
    SUPPORT: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3,
};

export const isAdmin = (role?: string | null): boolean =>
    role === 'ADMIN' || role === 'SUPER_ADMIN';

export const isStaff = (role?: string | null): boolean =>
    isAdmin(role) || role === 'SUPPORT';

export const rankOf = (role?: string | null): number =>
    role ? ROLE_RANK[role as UserRole] ?? 0 : 0;

// Guards used by admin routes. Supports the legacy single "ADMIN" role.
export const requireAdmin = (role?: string | null): boolean => isAdmin(role);
export const requireStaff = (role?: string | null): boolean => isStaff(role);

// Admin-only panel actions (Phase F+) can gate on this.
export const requireSuperAdmin = (role?: string | null): boolean => role === 'SUPER_ADMIN';

/** Map an arbitrary stored role string into the known set, tolerating legacy values. */
export const normalizeRole = (role?: string | null): UserRole => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SUPPORT' || role === 'CLIENT') {
        return role as UserRole;
    }
    if (role === 'USER') return 'CLIENT';
    return 'CLIENT';
};