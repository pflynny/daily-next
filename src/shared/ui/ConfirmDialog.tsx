"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <button
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/40 animate-fade-in"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl animate-fade-rise">
        <h3 className="mb-1.5 font-mono text-sm font-semibold text-ink">
          {title}
        </h3>
        {message && <p className="mb-4 text-sm text-muted">{message}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              destructive
                ? "rounded-lg bg-danger px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90"
                : "rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
