"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { todayKey } from "@/lib/utils/date";
import { ImagesIcon, StarIcon } from "@/shared/ui/icons";
import { useCheckIns } from "@/features/checkins/useCheckIns";
import { useMemories } from "./useMemories";

/** Memories and gratitudes from this date in earlier years — a quiet strip
 *  under the daily header. Renders nothing when there's nothing. */
export function OnThisDay() {
  const router = useRouter();
  const { timeline } = useMemories();
  const { checkIns } = useCheckIns();
  const today = todayKey();
  const monthDay = today.slice(5);
  const thisYear = Number(today.slice(0, 4));

  const items = useMemo(() => {
    const memories = timeline
      .filter((m) => m.occurredOn.slice(5) === monthDay && Number(m.occurredOn.slice(0, 4)) < thisYear)
      .map((m) => ({
        key: `m-${m.id}`,
        year: Number(m.occurredOn.slice(0, 4)),
        kind: "memory" as const,
        text: m.title || m.body || m.quoteAuthor || "Memory",
        photo: m.media.find((x) => x.kind === "image")?.url ?? null,
        milestone: m.milestone,
      }));
    const gratitudes = checkIns
      .filter((c) => c.date.slice(5) === monthDay && Number(c.date.slice(0, 4)) < thisYear)
      .map((c) => ({ year: Number(c.date.slice(0, 4)), text: c.gratitude.find((g) => g.trim()) ?? "" }))
      .filter((g) => g.text)
      .map((g) => ({ key: `g-${g.year}`, year: g.year, kind: "gratitude" as const, text: g.text, photo: null, milestone: false }));
    // one gratitude per year, memories first, newest year first
    const seen = new Set<number>();
    const dedupedGratitude = gratitudes.filter((g) => (seen.has(g.year) ? false : (seen.add(g.year), true)));
    return [...memories, ...dedupedGratitude].sort((a, b) => b.year - a.year);
  }, [timeline, checkIns, monthDay, thisYear]);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-500">
        On this day
      </span>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => router.push(it.kind === "memory" ? `/memories?year=${it.year}` : `/check-ins?date=${it.year}-${monthDay}`)}
            className="flex max-w-[260px] shrink-0 items-center gap-2 rounded-lg border border-line bg-paper px-2 py-1 text-left text-xs hover:border-brand-300"
          >
            {it.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.photo} alt="" className="size-6 shrink-0 rounded object-cover" />
            ) : it.milestone ? (
              <StarIcon size={13} className="shrink-0 fill-brand-500 text-brand-500" />
            ) : it.kind === "memory" ? (
              <ImagesIcon size={13} className="shrink-0 text-brand-500" />
            ) : (
              <span className="shrink-0 text-brand-500">♥</span>
            )}
            <span className="font-mono font-bold text-brand-700">{it.year}</span>
            <span className="truncate text-muted">
              {it.kind === "gratitude" ? `grateful for ${it.text}` : it.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
