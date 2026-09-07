"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { Modal } from "./Modal";
import { Button } from "./Button";
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
  const titleId = useId();

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} labelledBy={title ? titleId : undefined} label="Details" className="items-end justify-center sm:items-center">
      <div
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl",
          "sm:rounded-2xl",
          sizes[size],
          "animate-fade-rise",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="font-mono text-sm font-semibold uppercase tracking-wide text-ink">
            {title}
          </h2>
          <Button variant="ghost" size="icon"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-md p-1.5 text-muted hover:bg-sand hover:text-ink"
          >
            <XIcon size={18} />
          </Button>
        </div>
        <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-t border-line px-5 py-3.5 pb-safe">{footer}</div>
        )}
      </div>
    </Modal>
  );
}
