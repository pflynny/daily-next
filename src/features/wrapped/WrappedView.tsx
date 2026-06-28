"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, ChevronRight } from "@/shared/ui/icons";
import { DailyHeatmap } from "@/features/goals/DailyHeatmap";
import { useWrapped } from "./useWrapped";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function WrappedView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const w = useWrapped(year);

  const monthlyMax = Math.max(1, ...w.tasks.monthly);
  const hasData =
    w.tasks.total > 0 ||
    w.goals.checkIns > 0 ||
    w.collection.total > 0 ||
    w.memories.count > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="WRAPPED">
        <div className="flex items-center gap-1 rounded-lg border border-line px-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
            className="rounded p-1 text-muted hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="min-w-[3ch] text-center text-xs font-semibold text-ink">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
            disabled={year >= currentYear}
            aria-label="Next year"
            className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </PageHeader>

      <Screen>
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
          {/* Hero */}
          <section className="animate-fade-rise overflow-hidden rounded-3xl bg-brand-900 px-6 py-10 text-center text-brand-50">
            <div className="font-mono text-6xl font-bold tracking-tight">
              {year}
            </div>
            <div className="mt-1 text-sm font-semibold uppercase tracking-[0.3em] text-brand-200">
              Year in review
            </div>
            {hasData ? (
              <p className="mx-auto mt-4 max-w-sm text-sm text-brand-100/90">
                {w.tasks.completed} tasks done · {w.collection.total} things
                logged · {w.memories.count} memories kept
              </p>
            ) : (
              <p className="mx-auto mt-4 max-w-sm text-sm text-brand-100/80">
                Not much logged for {year} yet — it fills in as you go.
              </p>
            )}
          </section>

          {/* Tasks */}
          <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
            <SectionLabel>Tasks</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Big value={w.tasks.completed} label="Completed" />
              <Big value={`${w.tasks.completionRate}%`} label="Completion rate" />
              <Big value={w.tasks.activeDays} label="Active days" />
              <Big value={w.tasks.longestStreak} label="Longest streak" />
            </div>
            {w.tasks.busiestMonth && (
              <p className="mt-4 text-sm text-muted">
                Your busiest month was{" "}
                <span className="font-semibold text-ink">
                  {w.tasks.busiestMonth}
                </span>{" "}
                with {w.tasks.busiestMonthCount} done.
              </p>
            )}
            <div className="mt-5 flex items-end gap-1.5">
              {w.tasks.monthly.map((c, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end">
                    <div
                      className="w-full rounded-t bg-brand-400"
                      style={{ height: `${(c / monthlyMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-faint">
                    {MONTH_LETTERS[i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Activity heatmap */}
          <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
            <SectionLabel>Every day</SectionLabel>
            <p className="mb-4 text-sm text-muted">
              Tasks, goals and memories, all year.
            </p>
            <DailyHeatmap
              year={year}
              counts={w.activity}
              mode="intensity"
              max={w.activityMax}
            />
          </section>

          {/* Goals */}
          {w.goals.checkIns > 0 && (
            <section className="animate-fade-rise rounded-3xl bg-brand-700 p-6 text-brand-50">
              <SectionLabel dark>Goals</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <Big value={w.goals.checkIns} label="Check-ins" dark />
                <Big value={w.goals.tracked} label="Goals tracked" dark />
              </div>
              {w.goals.topGoal && (
                <p className="mt-4 text-sm text-brand-100/90">
                  Most consistent:{" "}
                  <span className="font-semibold text-white">
                    {w.goals.topGoal.title}
                  </span>{" "}
                  ({w.goals.topGoal.count} times)
                </p>
              )}
            </section>
          )}

          {/* Collections */}
          {w.collection.total > 0 && (
            <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
              <SectionLabel>Read &amp; watched</SectionLabel>
              <div className="mb-4 flex flex-wrap gap-4">
                {w.collection.byType.map((t) => (
                  <Big key={t.label} value={t.count} label={t.label} />
                ))}
              </div>
              {w.collection.topRated.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                    Top rated
                  </div>
                  <ul className="space-y-1.5">
                    {w.collection.topRated.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-ink">
                          {it.title}
                          {it.creator && (
                            <span className="text-muted"> · {it.creator}</span>
                          )}
                        </span>
                        <span className="shrink-0 font-bold text-brand-600">
                          {it.rating}/10
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Memories */}
          {w.memories.count > 0 && (
            <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
              <SectionLabel>Memories</SectionLabel>
              <Big value={w.memories.count} label="Moments captured" />
              {w.memories.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {w.memories.photos.map((m) => {
                    const img = m.media.find((md) => md.kind === "image");
                    if (!img) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={img.url}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-line object-cover"
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Featured quote */}
          {w.quotes.featured && (
            <section className="animate-fade-rise rounded-3xl bg-brand-900 p-8 text-center text-brand-50">
              <p className="font-serif text-xl italic leading-snug">
                “{w.quotes.featured.text}”
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide text-brand-200">
                {w.quotes.featured.author} · one of {w.quotes.count} you saved
              </p>
            </section>
          )}
        </div>
      </Screen>
    </div>
  );
}

function SectionLabel({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-4 text-xs font-semibold uppercase tracking-[0.2em]",
        dark ? "text-brand-200" : "text-brand-500",
      )}
    >
      {children}
    </div>
  );
}

function Big({
  value,
  label,
  dark,
}: {
  value: number | string;
  label: string;
  dark?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "font-mono text-3xl font-bold leading-none",
          dark ? "text-white" : "text-ink",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 text-xs uppercase tracking-wide",
          dark ? "text-brand-200" : "text-faint",
        )}
      >
        {label}
      </div>
    </div>
  );
}
