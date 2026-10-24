/**
 * TextField — labelled text / email / tel input for auth forms.
 *
 * Accessibility:
 *  - visible <label> associated via htmlFor/id
 *  - aria-describedby links error message
 *  - aria-invalid set on error
 *  - focus ring at 4.5:1 contrast
 */
import { forwardRef, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    /** Visible label text */
    label: string;
    /** Optional helper / error message shown below the input */
    error?: string;
    /** Trailing content rendered inside the input on the right (e.g. icon button) */
    suffix?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    function TextField({ label, error, suffix, id, className, ...props }, ref) {
        const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
        const errorId = `${inputId}-error`;

        return (
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor={inputId}
                    className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--auth-label)]"
                >
                    {label}
                </label>

                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={error ? "true" : undefined}
                        aria-describedby={error ? errorId : undefined}
                        className={[
                            "auth-field",
                            error ? "auth-field--error" : "",
                            suffix ? "pr-10" : "",
                            className ?? "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        {...props}
                    />
                    {suffix && (
                        <div className="absolute right-0 top-0 flex h-full items-center pr-3">
                            {suffix}
                        </div>
                    )}
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

export default TextField;
