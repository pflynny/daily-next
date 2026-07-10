"use client";

import { ChevronLeft, ChevronRight } from "@/shared/ui/icons";

/** Compact year stepper used in page headers (Goals, Wrapped, Memories…). */
export function YearPicker({
  year,
  onChange,
  max = new Date().getFullYear(),
  min = 2000,
}: {
  year: number;
  onChange: (year: number) => void;
  /** Latest selectable year (default: current). */
  max?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line px-1">
      <button
        onClick={() => onChange(year - 1)}
        disabled={year <= min}
        aria-label="Previous year"
        className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="min-w-[3ch] text-center text-xs font-semibold text-ink">
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        disabled={year >= max}
        aria-label="Next year"
        className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
