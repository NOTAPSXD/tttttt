import { z } from "zod";

export { z };

export type ParsedBody<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

/**
 * Parse and validate a JSON request body against a zod schema.
 * Returns a discriminated result; callers map `{ ok: false }` to a 400.
 */
export async function parseBody<T extends z.ZodTypeAny>(
    req: Request,
    schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; error: string }> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return { ok: false, error: "Invalid JSON body." };
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { ok: false, error: first ? `${first.path.join(".") || "field"}: ${first.message}` : "Invalid input." };
    }
    return { ok: true, data: parsed.data };
}

// ── Shared schemas ─────────────────────────────────────────────

export const emailSchema = z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email({ error: "Invalid email address" })
    .max(160);

/** bcrypt hard limit is 72 bytes; enforce a sane maximum + minimum. */
export const passwordSchema = z
    .string({ error: "Password is required" })
    .min(8, { error: "Password must be at least 8 characters" })
    .max(72, { error: "Password must be at most 72 characters" });

/** Six-digit TOTP / recovery code. */
export const otpSchema = z
    .string()
    .trim()
    .min(6, { error: "Code must be at least 6 characters" })
    .max(16, { error: "Invalid code" });

export const registerSchema = z.object({
    name: z.string().trim().min(2, { error: "Name is required" }).max(120),
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, { error: "Password is required" }).max(72),
    otp: otpSchema.optional().or(z.literal("")),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
    token: z.string().trim().min(20, { error: "Invalid token" }),
    password: passwordSchema,
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().trim().min(1, { error: "Current password is required" }),
    newPassword: passwordSchema,
});

export const enableTwoFaSchema = z.object({
    code: otpSchema,
});

export const disableTwoFaSchema = z.object({
    code: otpSchema,
});