"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { XIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width on desktop. */
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

/**
 * Responsive panel: a bottom sheet on mobile, a centered dialog on desktop.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px] animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl",
          "sm:rounded-2xl",
          sizes[size],
          "animate-fade-rise",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-md p-1.5 text-muted hover:bg-sand hover:text-ink"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-t border-line px-5 py-3.5 pb-safe">{footer}</div>
        )}
      </div>
    </div>
  );
}
