"use client";

import { useId } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

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
  const titleId = useId();
  const messageId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} describedBy={message ? messageId : undefined} className="items-center justify-center px-6">
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl animate-fade-rise">
        <h3 id={titleId} className="mb-1.5 font-mono text-sm font-semibold text-ink">
          {title}
        </h3>
        {message && <p id={messageId} className="mb-4 text-sm text-muted">{message}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button data-initial-focus
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
