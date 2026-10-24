/**
 * PasswordField — password input with accessible show/hide toggle.
 *
 * Accessibility:
 *  - Toggle button has aria-label and aria-pressed
 *  - Type switches between "password" and "text"
 *  - Same label/error wiring as TextField
 */
"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
    error?: string;
    /** Slot rendered after the label on the same row (e.g. "Forgot password?" link) */
    labelSuffix?: React.ReactNode;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
    function PasswordField({ label, error, labelSuffix, id, className, ...props }, ref) {
        const [visible, setVisible] = useState(false);
        const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
        const errorId = `${inputId}-error`;

        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor={inputId}
                        className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--auth-label)]"
                    >
                        {label}
                    </label>
                    {labelSuffix}
                </div>

                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        type={visible ? "text" : "password"}
                        aria-invalid={error ? "true" : undefined}
                        aria-describedby={error ? errorId : undefined}
                        className={[
                            "auth-field pr-10",
                            error ? "auth-field--error" : "",
                            className ?? "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        {...props}
                    />
                    <button
                        type="button"
                        aria-label={visible ? "Hide password" : "Show password"}
                        aria-pressed={visible}
                        onClick={() => setVisible((v) => !v)}
                        tabIndex={0}
                        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-[var(--auth-icon)] transition-colors duration-150 hover:text-[var(--auth-label)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--auth-surface)] rounded-sm"
                    >
                        {visible ? (
                            <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                        )}
                    </button>
                </div>

                {error && (
                    <p id={errorId} role="alert" className="text-[12px] text-[var(--auth-danger)] leading-snug">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

export default PasswordField;
