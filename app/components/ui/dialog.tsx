"use client";

import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/button";

export interface ConfirmDialogProps {
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
    danger = false,
    loading = false,
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Escape listener & auto-focus safe cancel button
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        // Focus cancel by default for safety on modals
        const timer = setTimeout(() => {
            cancelButtonRef.current?.focus();
        }, 50);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timer);
        };
    }, [open, loading, onCancel]);

    return (
        <AnimatePresence>
            {open && (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby={description ? "confirm-dialog-desc" : undefined}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !loading && onCancel()}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={dialogRef}
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className={cn(
                            "relative w-full max-w-md rounded-[10px] bg-[#11141a] p-6 shadow-2xl",
                            "border border-[#1f242d] focus:outline-none",
                            danger && "border-red-500/30"
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => !loading && onCancel()}
                            disabled={loading}
                            className="absolute top-4 right-4 p-1 rounded-md text-[#8b93a1] hover:text-[#e6e8ec] hover:bg-[#1a1f2a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] disabled:opacity-40"
                            aria-label="Close dialog"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>

                        <div className="flex items-start gap-3.5">
                            {danger && (
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                                    aria-hidden="true"
                                >
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 id="confirm-dialog-title" className="text-[15px] font-semibold text-[#e6e8ec] tracking-tight">
                                    {title}
                                </h3>
                                {description && (
                                    <p id="confirm-dialog-desc" className="mt-1.5 text-[13px] text-[#8b93a1] leading-relaxed">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {children && <div className="mt-4">{children}</div>}

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                ref={cancelButtonRef}
                                type="button"
                                disabled={loading}
                                onClick={onCancel}
                                className="h-9 px-4 rounded-[8px] text-[13px] font-medium text-[#8b93a1] hover:text-[#e6e8ec] bg-[#141820] hover:bg-[#1a1f2a] border border-[#1f242d] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <Button
                                size="sm"
                                variant={danger ? "danger" : "primary"}
                                loading={loading}
                                onClick={onConfirm}
                                className={cn(
                                    danger && "bg-red-600 hover:bg-red-500 text-white border border-red-500/40"
                                )}
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

export interface DestructiveActionDialogProps {
    open: boolean;
    title: string;
    description: string;
    matchPhrase?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Destructive confirmation modal (UX-layer safeguard)
 * Requires exact text match confirmation when `matchPhrase` is passed (e.g. server hostname or "DELETE")
 */
export function DestructiveActionDialog({
    open,
    title,
    description,
    matchPhrase,
    confirmLabel = "Confirm Action",
    cancelLabel = "Cancel",
    loading = false,
    onConfirm,
    onCancel,
}: DestructiveActionDialogProps) {
    const [inputVal, setInputVal] = React.useState("");
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (!open) {
            setInputVal("");
        }
    }, [open]);

    const isMatch = matchPhrase ? inputVal.trim() === matchPhrase.trim() : true;

    return (
        <AnimatePresence>
            {open && (
                <div
                    className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="destructive-dialog-title"
                    aria-describedby="destructive-dialog-desc"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !loading && onCancel()}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="relative w-full max-w-md rounded-[10px] bg-[#11141a] p-6 shadow-2xl border border-red-500/30"
                    >
                        <div className="flex items-start gap-3.5">
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                                aria-hidden="true"
                            >
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 id="destructive-dialog-title" className="text-[15px] font-semibold text-[#e6e8ec] tracking-tight">
                                    {title}
                                </h3>
                                <p id="destructive-dialog-desc" className="mt-1.5 text-[13px] text-[#8b93a1] leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {matchPhrase && (
                            <div className="mt-5 space-y-2">
                                <label
                                    htmlFor="confirm-phrase-input"
                                    className="block text-[12px] font-medium text-[#8b93a1]"
                                >
                                    Type <span className="font-mono font-bold text-red-400 select-all">{matchPhrase}</span> to confirm:
                                </label>
                                <input
                                    id="confirm-phrase-input"
                                    type="text"
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    placeholder={matchPhrase}
                                    disabled={loading}
                                    className="w-full rounded-[8px] bg-[#0a0c10] border border-[#1f242d] focus:border-red-500/50 focus:ring-1 focus:ring-red-500/40 text-[13px] text-[#e6e8ec] px-3 py-2 outline-none transition-colors"
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                ref={cancelButtonRef}
                                type="button"
                                disabled={loading}
                                onClick={onCancel}
                                className="h-9 px-4 rounded-[8px] text-[13px] font-medium text-[#8b93a1] hover:text-[#e6e8ec] bg-[#141820] hover:bg-[#1a1f2a] border border-[#1f242d] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <Button
                                size="sm"
                                variant="danger"
                                disabled={!isMatch || loading}
                                loading={loading}
                                onClick={onConfirm}
                                className="bg-red-600 hover:bg-red-500 text-white border border-red-500/40 disabled:opacity-40"
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
