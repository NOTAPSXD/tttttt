import { generateSecret, generateURI, verifySync } from "otplib";
import crypto from "crypto";
import type { HydratedDocument } from "mongoose";
import type { IUser } from "@/lib/models";
import { decryptSecret, hashHex } from "@/lib/crypto";

// Tolerate ±1 time step (30s) so a code entered right at a step boundary
// from a phone clock skew still validates.
const TOTP_EPOCH_TOLERANCE_SECONDS: [number, number] = [30, 30];

/** Verify a TOTP code against a base32 secret (with ±1 step tolerance). */
export function verifyTotp(secretBase32: string, code: string): boolean {
    if (!secretBase32) return false;
    try {
        const result = verifySync({
            secret: secretBase32,
            token: code.trim(),
            epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
        });
        return result.valid === true;
    } catch {
        return false;
    }
}

/** Random base32 TOTP secret (what you'd show in a QR / paste into an app). */
export function generateTotpSecret(): string {
    return generateSecret();
}

/** Build an otpauth:// URL for QR enrollment. */
export function totpProvisioningUri(secretBase32: string, email: string, issuer = "VexaNode"): string {
    return generateURI({ label: email, issuer, secret: secretBase32 });
}

/**
 * Verify a recovery code by comparing against stored hashes. Consumes the
 * matched code (single-use) and returns true on success.
 */
export async function consumeRecoveryCode(
    user: HydratedDocument<IUser>,
    code: string
): Promise<boolean> {
    const target = hashHex(code.trim());
    const hashes = user.twoFactor?.recoveryHashes ?? [];
    const idx = hashes.indexOf(target);
    if (idx === -1) return false;
    hashes.splice(idx, 1);
    user.twoFactor!.recoveryHashes = hashes;
    await user.save();
    return true;
}

/** Generate N replacement recovery codes; returns plaintext (show once). */
export function generateRecoveryCodes(count = 10): string[] {
    return Array.from({ length: count }, () =>
        crypto.randomBytes(12).toString("base64url").replace(/-/g, "").toUpperCase().slice(0, 16)
    );
}

/** Return the stored TOTP secret in plaintext (requires secretEnc set). */
export function storedTotpSecret(user: HydratedDocument<IUser>): string | null {
    const enc = user.twoFactor?.secretEnc;
    if (!enc) return null;
    try {
        return decryptSecret(enc);
    } catch {
        return null;
    }
}