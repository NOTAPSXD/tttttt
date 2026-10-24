/**
 * AuthAlert — inline status banner for auth forms.
 *
 * Accessibility:
 *  - role="alert" so screen readers announce it immediately on mount
 *  - variant="error" uses red; variant="success" uses green
 */
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface AuthAlertProps {
    variant: "error" | "success";
    message: string;
}

export function AuthAlert({ variant, message }: AuthAlertProps) {
    const isError = variant === "error";

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={[
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-snug",
                isError
                    ? "border-[var(--auth-danger)]/25 bg-[var(--auth-danger)]/[0.08] text-[var(--auth-danger)]"
                    : "border-[var(--auth-success)]/25 bg-[var(--auth-success)]/[0.08] text-[var(--auth-success)]",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {isError ? (
                <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium">{message}</span>
        </div>
    );
}

export default AuthAlert;
