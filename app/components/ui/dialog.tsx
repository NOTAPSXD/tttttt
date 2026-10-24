"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children?: React.ReactNode;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger,
    loading,
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="relative w-full max-w-md rounded-xl bg-surface border border-stroke p-6 shadow-2xl"
                    >
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-panel-faint hover:text-panel-text transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h3 className="text-base font-semibold text-panel-text">{title}</h3>
                        {description && (
                            <p className="mt-2 text-xs text-panel-muted leading-relaxed">{description}</p>
                        )}

                        {children}

                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                                {cancelLabel}
                            </Button>
                            <Button
                                size="sm"
                                variant={danger ? "danger" : "primary"}
                                loading={loading}
                                onClick={onConfirm}
                                className={cn(danger && "bg-danger-red/90 text-white hover:bg-danger-red")}
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default ConfirmDialog;