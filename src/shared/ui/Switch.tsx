"use client";

import { cn } from "@/lib/utils/cn";

/**
 * Toggle switch. All dimensions are rem-based (w-10/h-6 track, size-5 thumb,
 * translate-x-4 travel) so the thumb stays inside the track under mobile
 * font scaling — mixed px/rem here previously clipped the thumb off-screen.
 */
export function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 overflow-hidden rounded-full transition-colors",
        checked ? "bg-brand-600" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-[white] transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
