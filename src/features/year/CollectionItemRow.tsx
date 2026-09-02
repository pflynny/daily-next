"use client";

import { cn } from "@/lib/utils/cn";
import { ChevronDown, ChevronUp, NoteIcon, StarIcon } from "@/shared/ui/icons";
import type { CollectionItem } from "@/types";

export function CollectionItemRow({
  item,
  rank,
  canMoveUp,
  canMoveDown,
  onClick,
  onMove,
}: {
  item: CollectionItem;
  /** 1-based rank for ranked (all-time) lists; omitted for yearly lists. */
  rank?: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onClick: (item: CollectionItem) => void;
  onMove?: (item: CollectionItem, dir: -1 | 1) => void;
}) {
  const ranked = rank !== undefined;
  return (
    <div
      className={cn(
        "group/row flex items-start gap-2 border-b border-line/70",
        item.pick && !ranked &&
          "rounded-lg border border-brand-400 bg-brand-50/70 ring-1 ring-brand-200",
      )}
    >
      {ranked && (
        <span
          className={cn(
            "w-6 shrink-0 pt-2.5 text-right font-mono text-sm font-bold tabular-nums",
            rank <= 3 ? "text-brand-600" : "text-faint",
          )}
        >
          {rank}
        </span>
      )}
      <button
        onClick={() => onClick(item)}
        className={cn(
          "flex min-w-0 flex-1 items-start justify-between gap-3 py-2.5 text-left transition-colors hover:bg-sand/50",
          item.pick && !ranked ? "px-2" : "px-1",
        )}
      >
        <span className="min-w-0">
          {item.pick && !ranked && (
            <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
              <StarIcon size={11} className="fill-brand-500 text-brand-500" />
              Pick of the year
            </span>
          )}
          <span className="block break-words text-sm leading-snug text-ink [overflow-wrap:anywhere]">
            {item.title}
          </span>
          {item.creator && (
            <span className="mt-0.5 block truncate text-xs text-muted">
              {item.creator}
            </span>
          )}
          {(item.startedOn || item.happenedOn) && (
            <span className="mt-0.5 block text-[11px] text-faint">
              {[item.startedOn, item.happenedOn]
                .filter(Boolean)
                .map((d) =>
                  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  }),
                )
                .join(" – ")}
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
      {ranked && onMove && (
        <span className="hover-reveal flex shrink-0 flex-col pt-1.5 text-faint">
          <button
            onClick={() => onMove(item, -1)}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="rounded p-0.5 hover:text-ink disabled:opacity-30"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => onMove(item, 1)}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="rounded p-0.5 hover:text-ink disabled:opacity-30"
          >
            <ChevronDown size={13} />
          </button>
        </span>
      )}
    </div>
  );
}
