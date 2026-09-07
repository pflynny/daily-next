"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/** Native modal dialogs make the background inert and contain keyboard focus. */
export function Modal({ open, onClose, children, className, labelledBy, describedBy, label }: {
  open: boolean;
  onClose(): void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const initial = dialog.querySelector<HTMLElement>("[data-initial-focus], [autofocus]");
    initial?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={cn("app-modal fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-ink open:flex", className)}
    >
      {open && children}
    </dialog>
  );
}
