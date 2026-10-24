/**
 * AuthLayout
 *
 * Desktop: two columns.
 *   Left  — brand panel with darkened background image, logo, short headline,
 *            3 bullet points. No unverified claims. Uses placeholder copy.
 *   Right — form column, max-w-[400px], centered, bg #11141a.
 *
 * Mobile: left panel hidden, full-width form, min-h-dvh.
 *
 * Design: #0a0c10 bg · #11141a surface · #1f242d border · #3b82f6 accent.
 * No glassmorphism, no heavy gradients, no glow, no decorative animation.
 */

import { Check } from "lucide-react";

const BRAND_POINTS = [
    "Full control over your servers — start, stop, reboot, and monitor in real time.",
    "Instant alerts and usage insights keep you ahead of downtime.",
    "Secure by default with two-factor authentication and audit logs.",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex min-h-dvh lg:min-h-screen"
            style={{ background: "var(--auth-bg)", color: "var(--auth-text)" }}
        >
            {/* ── Left: brand panel (lg+) ──────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden"
                aria-hidden="true"
            >
                {/* Background image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/login_bg.png')" }}
                />
                {/*
                  Overlay: left ~60% is nearly opaque so text is always readable;
                  right edge fades out, creating a soft blend with the form column.
                  No hard seam.
                */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(to right, #0a0c10 0%, #0a0c10 45%, rgba(10,12,16,0.92) 65%, rgba(10,12,16,0.55) 100%)",
                    }}
                />
                {/* Bottom fade to unify with the page bg */}
                <div
                    className="absolute inset-x-0 bottom-0 h-32"
                    style={{
                        background: "linear-gradient(to top, #0a0c10, transparent)",
                    }}
                />

                {/* Panel content */}
                <div className="relative z-10 flex flex-col h-full px-14 py-12 xl:px-16 xl:py-14">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 select-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.png"
                            alt="VexaNode logo"
                            width={28}
                            height={28}
                            className="object-contain"
                        />
                        <span
                            className="text-[14px] font-bold tracking-[0.12em]"
                            style={{ color: "var(--auth-text)" }}
                        >
                            VEXANODE
                        </span>
                    </div>

                    {/* Main copy — pushed to vertical center */}
                    <div className="my-auto max-w-[380px]">
                        <p
                            className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4"
                            style={{ color: "var(--auth-accent)" }}
                        >
                            VPS Management Platform
                        </p>

                        <h1
                            className="text-[2.35rem] xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight mb-4"
                            style={{ color: "var(--auth-text)" }}
                        >
                            Manage your infrastructure with confidence.
                        </h1>

                        <p
                            className="text-[15px] leading-relaxed mb-8"
                            style={{ color: "var(--auth-muted)" }}
                        >
                            One dashboard to provision, monitor, and control all your VPS instances — without the complexity.
                        </p>

                        <ul className="space-y-3">
                            {BRAND_POINTS.map((point) => (
                                <li key={point} className="flex items-start gap-3">
                                    <span
                                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: "rgba(59,130,246,0.12)",
                                            color: "var(--auth-accent)",
                                        }}
                                    >
                                        <Check className="h-3 w-3" strokeWidth={2.5} />
                                    </span>
                                    <span
                                        className="text-[14px] leading-snug"
                                        style={{ color: "var(--auth-label)" }}
                                    >
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Footer */}
                    <p
                        className="text-[12px]"
                        style={{ color: "var(--auth-muted)" }}
                    >
                        &copy; {new Date().getFullYear()} VexaNode
                    </p>
                </div>
            </div>

            {/* ── Right: form column ────────────────────────────────────── */}
            <div
                className="flex flex-1 flex-col justify-center items-center px-5 py-10 sm:px-8 min-h-dvh lg:min-h-0"
                style={{ background: "#11141a" }}
            >
                {/* Mobile logo — visible only when left panel is hidden */}
                <div className="lg:hidden w-full max-w-[400px] mb-8 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.png"
                        alt="VexaNode logo"
                        width={24}
                        height={24}
                        className="object-contain"
                    />
                    <span
                        className="text-[13px] font-bold tracking-[0.12em]"
                        style={{ color: "var(--auth-text)" }}
                    >
                        VEXANODE
                    </span>
                </div>

                {/* Form slot */}
                <div className="w-full max-w-[400px]">
                    {children}
                </div>
            </div>
        </div>
    );
}
