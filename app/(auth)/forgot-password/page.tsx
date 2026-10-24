"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, MailCheck } from "lucide-react";
import { TextField, AuthButton, AuthAlert } from "@/app/components/auth";

type Status = "idle" | "loading" | "sent";

export default function ForgotPasswordPage() {
    const [email, setEmail]   = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError]   = useState("");

    const emailRef = useRef<HTMLInputElement>(null);
    useEffect(() => { emailRef.current?.focus(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === "loading") return;
        setStatus("loading");
        setError("");

        try {
            await axios.post("/api/auth/forgot-password", { email });
        } catch (err: any) {
            // Only surface rate-limit errors — everything else is silent (enumeration-safe)
            if (err?.response?.status === 429) {
                setError(err.response.data?.error ?? "Too many requests. Please wait before trying again.");
                setStatus("idle");
                return;
            }
        }
        // Always show "sent" — never confirm whether address exists
        setStatus("sent");
    };

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

            {status === "sent" ? (
                /* ── Success state ── */
                <div>
                    <div
                        className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{
                            background: "rgba(52,211,153,0.10)",
                            border: "1px solid var(--auth-border)",
                        }}
                    >
                        <MailCheck
                            className="h-5 w-5"
                            style={{ color: "var(--auth-success)" }}
                            aria-hidden="true"
                        />
                    </div>

                    <h1
                        className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                        style={{ color: "var(--auth-text)" }}
                    >
                        Check your inbox
                    </h1>
                    <p className="mb-8 text-[14px]" style={{ color: "var(--auth-muted)" }}>
                        If <span style={{ color: "var(--auth-text)" }}>{email}</span> is
                        registered, a reset link is on its way. Check your spam folder too.
                    </p>

                    <Link
                        href="/login"
                        className="auth-btn flex items-center justify-center no-underline"
                        style={{ textDecoration: "none" }}
                    >
                        Return to sign in
                    </Link>
                </div>
            ) : (
                /* ── Form state ── */
                <>
                    <div className="mb-8">
                        <h1
                            className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                            style={{ color: "var(--auth-text)" }}
                        >
                            Reset password
                        </h1>
                        <p className="text-[14px]" style={{ color: "var(--auth-muted)" }}>
                            Enter your email and we&apos;ll send a reset link.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5">
                            <AuthAlert variant="error" message={error} />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <TextField
                            ref={emailRef}
                            label="Email"
                            type="email"
                            id="fp-email"
                            autoComplete="username"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="pt-1">
                            <AuthButton loading={status === "loading"}>
                                Send reset link
                            </AuthButton>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
