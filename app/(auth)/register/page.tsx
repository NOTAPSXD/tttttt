"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { TextField, PasswordField, AuthButton, AuthAlert } from "@/app/components/auth";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName]         = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");

    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { nameRef.current?.focus(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");

        try {
            await axios.post("/api/auth/register", { name, email, password });
            router.push("/login?registered=true");
        } catch (err: any) {
            setError(err.response?.data?.error || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1
                    className="text-[1.65rem] font-bold tracking-tight leading-tight mb-1.5"
                    style={{ color: "var(--auth-text)" }}
                >
                    Create account
                </h1>
                <p className="text-[14px]" style={{ color: "var(--auth-muted)" }}>
                    Get started — it only takes a moment.
                </p>
            </div>

            {error && (
                <div className="mb-5">
                    <AuthAlert variant="error" message={error} />
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <TextField
                    ref={nameRef}
                    label="Full name"
                    type="text"
                    id="reg-name"
                    autoComplete="name"
                    required
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <TextField
                    label="Email"
                    type="email"
                    id="reg-email"
                    autoComplete="username"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <PasswordField
                    label="Password"
                    id="reg-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="pt-1">
                    <AuthButton loading={loading}>Create account</AuthButton>
                </div>
            </form>

            <p
                className="mt-6 text-center text-[13px]"
                style={{ color: "var(--auth-muted)" }}
            >
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="font-medium transition-colors duration-150"
                    style={{ color: "var(--auth-text)" }}
                    onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.color = "var(--auth-accent)")
                    }
                    onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.color = "var(--auth-text)")
                    }
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
