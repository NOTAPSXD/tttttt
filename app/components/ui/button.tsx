"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-primary-blue text-white hover:bg-primary-blue/90 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]",
    secondary:
        "bg-surface-3 text-panel-text border border-stroke hover:border-stroke-strong hover:bg-surface-2",
    outline:
        "bg-transparent text-panel-text border border-stroke hover:border-stroke-strong hover:bg-surface-2",
    ghost: "bg-transparent text-panel-muted hover:text-panel-text hover:bg-surface-2",
    danger:
        "bg-danger-red/10 text-danger-red border border-danger-red/30 hover:bg-danger-red/20",
    success:
        "bg-success-green/10 text-success-green border border-success-green/30 hover:bg-success-green/20",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2",
    icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "secondary", size = "md", loading, disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/60",
                    "disabled:opacity-50 disabled:pointer-events-none select-none",
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                )}
                {...props}
            >
                {children}
            </button>
        );
    },
);

Button.displayName = "Button";

export default Button;