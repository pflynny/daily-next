"use client";

import { cn } from "@/lib/utils/cn";
import { NoteIcon } from "@/shared/ui/icons";
import type { CollectionItem } from "@/types";

export function CollectionItemRow({
  item,
  onClick,
}: {
  item: CollectionItem;
  onClick: (item: CollectionItem) => void;
}) {
  return (
    <button
      onClick={() => onClick(item)}
      className="flex w-full items-start justify-between gap-3 border-b border-line/70 px-1 py-2.5 text-left transition-colors hover:bg-sand/50"
    >
      <span className="min-w-0">
        <span className="block break-words text-sm leading-snug text-ink [overflow-wrap:anywhere]">
          {item.title}
        </span>
        {item.creator && (
          <span className="mt-0.5 block truncate text-xs text-muted">
            {item.creator}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {item.notes.trim() && (
          <NoteIcon size={13} className="text-brand-500" />
        )}
        {typeof item.rating === "number" && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
              item.rating >= 8
                ? "bg-brand-600 text-white"
                : item.rating >= 5
                  ? "bg-brand-100 text-brand-800"
                  : "bg-sand text-muted",
            )}
          >
            {item.rating}/10
          </span>
        )}
      </span>
    </button>
  );
}
