"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Markdown } from "@/shared/ui/Markdown";

/** Notes textarea with a Write/Preview toggle — markdown renders in preview. */
export function NotesField({
  value,
  onChange,
  placeholder = "Add details, links, context… (markdown works)",
  rows = 5,
  label = "Notes",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        <div className="flex items-center rounded-lg border border-line p-0.5 text-[10px] font-semibold uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "rounded-md px-1.5 py-0.5",
              !preview ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "rounded-md px-1.5 py-0.5",
              preview ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Preview
          </button>
        </div>
      </div>
      {preview ? (
        <div className="min-h-[7rem] rounded-lg border border-line bg-paper px-3 py-2">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-faint">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      )}
    </div>
  );
}
