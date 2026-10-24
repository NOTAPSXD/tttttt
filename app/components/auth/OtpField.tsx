/**
 * OtpField — single-line numeric code input (TOTP / recovery).
 *
 * Accessibility:
 *  - autocomplete="one-time-code"
 *  - inputMode="numeric" for numeric keyboard on mobile
 *  - pattern / maxLength constrain input on-device
 *  - Same label/error wiring as TextField
 */
"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface OtpFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    error?: string;
    id?: string;
}

export const OtpField = forwardRef<HTMLInputElement, OtpFieldProps>(
    function OtpField(
        {
            label = "Verification code",
            error,
            id,
            className,
            ...props
        },
        ref
    ) {
        const inputId = id ?? "field-otp";
        const errorId = `${inputId}-error`;

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--auth-label)]"
                    >
                        {label}
                    </label>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d*"
                    maxLength={16}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={[
                        /* Wider letter spacing so the 6 digits read clearly */
                        "auth-field text-center tracking-[0.35em] font-mono text-lg",
                        error ? "auth-field--error" : "",
                        className ?? "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    {...props}
                />

                {error && (
                    <p id={errorId} role="alert" className="text-[12px] text-[var(--auth-danger)] leading-snug">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

export default OtpField;
