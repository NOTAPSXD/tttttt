"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, KeyRound } from "lucide-react";
import { PasswordField, AuthButton, AuthAlert } from "@/app/components/auth";

// ── Inner form (needs useSearchParams — must be inside Suspense) ────────────

function ResetForm() {
    const searchParams = useSearchParams();
    const router       = useRouter();
    const token        = searchParams.get("token");

    const [password, setPassword]     = useState("");
    const [confirm, setConfirm]       = useState("");
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState("");
    const [succeeded, setSucceeded]   = useState(false);

    const passwordRef = useRef<HTMLInputElement>(null);
    useEffect(() => { passwordRef.current?.focus(); }, []);

    if (!token) {
        return (
            <div>
                <AuthAlert
                    variant="error"
                    message="This reset link is invalid or has already been used. Request a new one."
                />
                <Link
                    href="/forgot-password"
                    className="mt-5 auth-btn flex items-center justify-center no-underline"
                    style={{ textDecoration: "none" }}
                >
                    Request new link
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (password !== confirm) {
            setError("Passwords don't match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await axios.post("/api/auth/reset-password", { token, password });
            setSucceeded(true);
            // Auto-redirect after 3 s
            setTimeout(() => router.push("/login"), 3000);
        } catch (err: any) {
            const msg = err?.response?.data?.error;
            if (err?.response?.status === 429) {
                setError(msg ?? "Too many attempts. Please wait before trying again.");
            } else {
                setError(msg ?? "This link is invalid or has expired. Please request a new one.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (succeeded) {
        return (
            <div>
                <AuthAlert variant="success" message="Password updated. Redirecting you to sign in…" />
                <Link
                    href="/login"
                    className="mt-5 auth-btn flex items-center justify-center no-underline"
                    style={{ textDecoration: "none" }}
                >
                    Sign in now
                </Link>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="mb-5">
                    <AuthAlert variant="error" message={error} />
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <PasswordField
                    ref={passwordRef}
                    label="New password"
                    id="rp-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <PasswordField
                    label="Confirm password"
                    id="rp-confirm"
                    autoComplete="new-password"
                    required
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />

                <div className="pt-1">
                    <AuthButton loading={loading}>Set new password</AuthButton>
                </div>
            </form>
        </>
    );
}

// ── Page shell ──────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
    return (
        <div>
            <Link
                href="/login"
                className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
                style={{ color: "var(--auth-muted)" }}
                onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.color = "var(--auth-text)")
                }
                onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = "var(--auth-muted)")
                }
            >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to sign in
            </Link>

            <div
                className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid var(--auth-border)",
                }}
            >
                <KeyRound
                    className="h-5 w-5"
                    style={{ color: "var(--auth-accent)" }}
                    aria-hidden="true"
                />
            </div>

            <div className="mb-8">
                <h1
                    className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                    style={{ color: "var(--auth-text)" }}
                >
                    Set new password
                </h1>
                <p className="text-[14px]" style={{ color: "var(--auth-muted)" }}>
                    Choose a strong password — at least 8 characters.
                </p>
            </div>

            <Suspense
                fallback={
                    <div
                        className="h-11 w-full rounded-lg"
                        style={{ background: "var(--auth-border)", opacity: 0.4 }}
                        aria-label="Loading…"
                    />
                }
            >
                <ResetForm />
            </Suspense>
        </div>
    );
}
