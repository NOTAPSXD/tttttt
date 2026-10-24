import { NextRequest } from "next/server";

/**
 * F-004: Defense-in-depth CSRF verification for state-changing requests.
 * Verifies that the Origin or Referer header matches the host on mutation methods.
 */
export function validateCsrfOrigin(req: NextRequest | Request): boolean {
    const method = req.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
        return true;
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (!host) return true;

    const hostClean = host.toLowerCase().split(":")[0];

    const origin = req.headers.get("origin");
    if (origin) {
        try {
            const originHost = new URL(origin).host.toLowerCase().split(":")[0];
            return originHost === hostClean;
        } catch {
            return false;
        }
    }

    const referer = req.headers.get("referer");
    if (referer) {
        try {
            const refererHost = new URL(referer).host.toLowerCase().split(":")[0];
            return refererHost === hostClean;
        } catch {
            return false;
        }
    }

    return true;
}
