/**
 * Login page — progressive 2FA
 *
 * Step 1: email + password
 *   POST /api/auth/2fa-challenge { action:"issue" }
 *   → { requires2fa: false }  → signIn() directly
 *   → { requires2fa: true, challengeToken }  → go to step 2
 *
 * Step 2: 6-digit TOTP / recovery code
 *   POST /api/auth/2fa-challenge { action:"verify" }
 *   → { ok: true }  → signIn() with email + password + otp
 *
 * This keeps the actual NextAuth credentials authorize() call unchanged —
 * all the same rate limiting, session registration, login history recording,
 * and password-hash-invalidation logic continues to run.
 */
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
    TextField,
    PasswordField,
    OtpField,
    AuthButton,
    AuthAlert,
} from "@/app/components/auth";

// ── Types ──────────────────────────────────────────────────────────────────

type Step = "credentials" | "otp";

interface ChallengeIssueResponse {
    requires2fa: boolean;
    challengeToken?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

function LoginForm() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const justRegistered = searchParams.get("registered") === "true";

    // Step 1 state
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");

    // Step 2 state
    const [step, setStep]                   = useState<Step>("credentials");
    const [challengeToken, setChallengeToken] = useState("");
    const [otp, setOtp]                     = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");

    // Focus management
    const emailRef = useRef<HTMLInputElement>(null);
    const otpRef   = useRef<HTMLInputElement>(null);

    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    useEffect(() => {
        if (step === "otp") {
            // Small delay so the element has rendered
            setTimeout(() => otpRef.current?.focus(), 60);
        }
    }, [step]);

    // ── Step 1: check credentials → possibly issue challenge ──────────────

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");

        try {
            const { data } = await axios.post<ChallengeIssueResponse>(
                "/api/auth/2fa-challenge",
                { action: "issue", email, password }
            );

            if (data.requires2fa) {
                // User has 2FA — store the challenge token and show OTP step
                setChallengeToken(data.challengeToken!);
                setStep("otp");
            } else {
                // No 2FA — sign in directly via NextAuth
                await doSignIn("");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error;
            if (err?.response?.status === 429) {
                setError(msg ?? "Too many attempts. Please wait before trying again.");
            } else {
                // Generic — never reveal whether account exists
                setError("Invalid email or password.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: verify OTP → then sign in ────────────────────────────────

    const handleOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");

        try {
            await axios.post("/api/auth/2fa-challenge", {
                action: "verify",
                challengeToken,
                code: otp,
            });

            // OTP verified — now complete the NextAuth credentials flow
            await doSignIn(otp);
        } catch (err: any) {
            const msg = err?.response?.data?.error;
            if (err?.response?.status === 429) {
                setError(msg ?? "Too many attempts. Please wait before trying again.");
            } else if (err?.response?.status === 400) {
                // Challenge expired
                setError("Verification expired. Please sign in again.");
                handleBack();
            } else {
                setError(msg ?? "Invalid verification code.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Shared: final NextAuth signIn call ────────────────────────────────

    const doSignIn = async (code: string) => {
        const res = await signIn("credentials", {
            email,
            password,
            otp: code,
            redirect: false,
        });

        if (res?.error) {
            // Shouldn't reach here after challenge verification succeeded,
            // but handle defensively
            setError("Invalid email or password.");
            setStep("credentials");
        } else {
            router.push("/client");
            router.refresh();
        }
    };

    // ── Back to step 1 ────────────────────────────────────────────────────

    const handleBack = () => {
        setStep("credentials");
        setOtp("");
        setError("");
        setChallengeToken("");
        setTimeout(() => emailRef.current?.focus(), 60);
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Success banner for new registrations */}
            {justRegistered && step === "credentials" && (
                <div className="mb-6">
                    <AuthAlert variant="success" message="Account created — you can sign in now." />
                </div>
            )}

            {/* ── Step 1: credentials ── */}
            {step === "credentials" && (
                <>
                    <div className="mb-8">
                        <h1
                            className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                            style={{ color: "var(--auth-text)" }}
                        >
                            Sign in
                        </h1>
                        <p className="text-[14px]" style={{ color: "var(--auth-muted)" }}>
                            Enter your credentials to access your account.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5">
                            <AuthAlert variant="error" message={error} />
                        </div>
                    )}

                    <form onSubmit={handleCredentials} noValidate className="space-y-4">
                        <TextField
                            ref={emailRef}
                            label="Email"
                            type="email"
                            id="login-email"
                            autoComplete="username"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <PasswordField
                            label="Password"
                            id="login-password"
                            autoComplete="current-password"
                            required
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            labelSuffix={
                                <Link
                                    href="/forgot-password"
                                    className="text-[12px] font-medium transition-colors duration-150"
                                    style={{ color: "var(--auth-muted)" }}
                                    onMouseEnter={(e) =>
                                        ((e.target as HTMLElement).style.color = "var(--auth-text)")
                                    }
                                    onMouseLeave={(e) =>
                                        ((e.target as HTMLElement).style.color = "var(--auth-muted)")
                                    }
                                >
                                    Forgot password?
                                </Link>
                            }
                        />

                        <div className="pt-1">
                            <AuthButton loading={loading}>Continue</AuthButton>
                        </div>
                    </form>

                    <p
                        className="mt-6 text-center text-[13px]"
                        style={{ color: "var(--auth-muted)" }}
                    >
                        No account?{" "}
                        <Link
                            href="/register"
                            className="font-medium transition-colors duration-150"
                            style={{ color: "var(--auth-text)" }}
                            onMouseEnter={(e) =>
                                ((e.target as HTMLElement).style.color = "var(--auth-accent)")
                            }
                            onMouseLeave={(e) =>
                                ((e.target as HTMLElement).style.color = "var(--auth-text)")
                            }
                        >
                            Create account
                        </Link>
                    </p>
                </>
            )}

            {/* ── Step 2: 2FA OTP ── */}
            {step === "otp" && (
                <>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="mb-6 flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
                        style={{ color: "var(--auth-muted)" }}
                        onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.color = "var(--auth-text)")
                        }
                        onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.color = "var(--auth-muted)")
                        }
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        Back
                    </button>

                    <div className="mb-8">
                        {/* Icon */}
                        <div
                            className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{
                                background: "rgba(59,130,246,0.10)",
                                border: "1px solid var(--auth-border)",
                            }}
                        >
                            <ShieldCheck
                                className="h-5 w-5"
                                style={{ color: "var(--auth-accent)" }}
                                aria-hidden="true"
                            />
                        </div>

                        <h1
                            className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                            style={{ color: "var(--auth-text)" }}
                        >
                            Two-factor auth
                        </h1>
                        <p className="text-[14px]" style={{ color: "var(--auth-muted)" }}>
                            Enter the 6-digit code from your authenticator app, or a recovery code.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5">
                            <AuthAlert variant="error" message={error} />
                        </div>
                    )}

                    <form onSubmit={handleOtp} noValidate className="space-y-4">
                        <OtpField
                            ref={otpRef}
                            label="Verification code"
                            id="login-otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                        />

                        <div className="pt-1">
                            <AuthButton loading={loading}>Verify &amp; sign in</AuthButton>
                        </div>
                    </form>

                    <p
                        className="mt-5 text-center text-[13px]"
                        style={{ color: "var(--auth-muted)" }}
                    >
                        Lost access to your app?{" "}
                        <span style={{ color: "var(--auth-label)" }}>
                            Use a recovery code above.
                        </span>
                    </p>
                </>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
