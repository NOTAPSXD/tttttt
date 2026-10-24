/**
 * AuthButton — primary CTA button for auth forms.
 *
 * - Prevents double-submit via `disabled` when loading
 * - Shows spinner inline; replaces label text to avoid layout shift
 * - 44px min height for mobile tap targets
 */
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
}

export function AuthButton({ loading, disabled, children, className, ...props }: AuthButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading || disabled}
            aria-busy={loading}
            className={[
                "auth-btn",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Loading…</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}

export default AuthButton;
