"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { XIcon } from "@/shared/ui/icons";
import { TONE_STYLE } from "@/features/checkins/FeelingPicker";
import { type FeelingTone } from "@/features/checkins/feelings";
import { useFeelings } from "@/features/checkins/useFeelings";

const GROUPS: { tone: FeelingTone; label: string }[] = [
  { tone: "up", label: "Positive" },
  { tone: "flat", label: "Neutral" },
  { tone: "down", label: "Difficult" },
];

/** Manage the check-in vocabulary: add, rename, remove, restore. */
export function FeelingWordsSection() {
  const { feelings, hidden, addWord, removeWord, renameWord, restoreWord } =
    useFeelings();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Tap a word to rename it, ✕ to remove it. New words appear before the
        “more” expander in the check-in.
      </p>

      {GROUPS.map(({ tone, label }) => (
        <div key={tone}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {label}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {feelings
              .filter((f) => f.tone === tone)
              .map(({ word }) =>
                editing === word ? (
                  <input
                    key={word}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      renameWord(word, draft, tone);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="w-24 rounded-full border border-brand-400 bg-paper px-2.5 py-1 text-xs outline-none"
                  />
                ) : (
                  <span
                    key={word}
                    className={cn(
                      "flex items-center gap-1 rounded-full border py-1 pl-2.5 pr-1.5 text-xs",
                      TONE_STYLE[tone].off,
                    )}
                  >
                    <button
                      onClick={() => {
                        setDraft(word);
                        setEditing(word);
                      }}
                      className="hover:text-ink"
                    >
                      {word}
                    </button>
                    <button
                      onClick={() => removeWord(word)}
                      aria-label={`Remove ${word}`}
                      className="rounded-full p-0.5 text-faint hover:bg-danger/10 hover:text-danger"
                    >
                      <XIcon size={11} />
                    </button>
                  </span>
                ),
              )}
            <input
              value={adding[tone] ?? ""}
              onChange={(e) => setAdding((p) => ({ ...p, [tone]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && adding[tone]?.trim()) {
                  addWord(adding[tone], tone);
                  setAdding((p) => ({ ...p, [tone]: "" }));
                }
              }}
              placeholder="+ add"
              className="w-20 rounded-full border border-dashed border-line bg-transparent px-2.5 py-1 text-xs outline-none placeholder:text-faint focus:border-brand-400"
            />
          </div>
        </div>
      ))}

      {hidden.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Removed — tap to restore
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hidden.map((word) => (
              <button
                key={word}
                onClick={() => restoreWord(word)}
                className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-faint line-through hover:text-ink hover:no-underline"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
