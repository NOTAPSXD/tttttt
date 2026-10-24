import crypto from "crypto";

/**
 * Field-level encryption used for secrets at rest (TOTP secrets, and
 * anything else marked *Enc in the schema). Uses AES-256-GCM with a key
 * derived from ENCRYPTION_KEY (32 raw bytes, base64 encoded in .env).
 */

function keyMaterial(): Buffer {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
        throw new Error("ENCRYPTION_KEY is not set. Run `openssl rand -base64 32` and add it to .env");
    }
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be 32 bytes (base64 of `openssl rand -base64 32`)");
    }
    return buf;
}

/** Encrypt a plaintext string into `iv:tag:data` (all base64url). */
export function encryptSecret(plaintext: string): string {
    const key = keyMaterial();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(":");
}

/** Decrypt a value produced by {@link encryptSecret}. */
export function decryptSecret(payload: string): string {
    const key = keyMaterial();
    const parts = payload.split(":");
    if (parts.length !== 3) throw new Error("Malformed encrypted value");
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]);
    return dec.toString("utf8");
}

/** SHA-256 hex digest for things we only ever compare (recovery codes). */
export function hashHex(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
}