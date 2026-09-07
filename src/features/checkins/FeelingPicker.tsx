"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "@/shared/ui/icons";
import { type FeelingTone } from "./feelings";
import { useFeelings } from "./useFeelings";

export const TONE_STYLE: Record<FeelingTone, { on: string; off: string }> = {
  up: {
    on: "border-brand-500 bg-brand-500 text-white",
    off: "border-line text-muted hover:border-brand-400 hover:text-ink",
  },
  flat: {
    on: "border-ink/60 bg-ink/70 text-white",
    off: "border-line text-muted hover:border-ink/40 hover:text-ink",
  },
  down: {
    on: "border-amber-700/70 bg-amber-700/80 text-white",
    off: "border-line text-muted hover:border-amber-600/60 hover:text-ink",
  },
};

interface FeelingPickerProps {
  selected: string[];
  onToggle: (word: string) => void;
}

export function FeelingPicker({ selected, onToggle }: FeelingPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const { feelings, primary } = useFeelings();
  const sel = new Set(selected);

  // Always show primary words plus anything already selected.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? feelings.filter((f) => f.word.toLowerCase().includes(q)) : feelings;
  }, [feelings, query]);
  const visible = expanded
    ? filtered
    : feelings.filter((f) => primary.has(f.word) || sel.has(f.word));
  const hiddenCount = feelings.length - visible.length;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ word, tone }) => {
          const on = sel.has(word);
          return (
            <button
              key={word}
              onClick={() => onToggle(word)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs transition-colors",
                on ? TONE_STYLE[tone].on : TONE_STYLE[tone].off,
              )}
            >
              {word}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => { setExpanded(true); setQuery(""); }}
            className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-line px-3 text-xs text-faint hover:text-ink"
          >
            <ChevronDown size={12} /> {hiddenCount} more
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-line px-3 text-xs text-faint hover:text-ink"
          >
            <ChevronDown size={12} className="rotate-180" /> less
          </button>
        )}
      </div>
      {expanded && (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all feelings…"
          aria-label="Search all feelings"
          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-brand-400"
        />
      )}
    </div>
  );
}
