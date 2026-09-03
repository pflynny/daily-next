"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { addDays, formatLongDate, startOfWeek, toDateKey, todayKey } from "@/lib/utils/date";
import { ChevronLeft, ChevronRight } from "@/shared/ui/icons";
import { useAppData } from "@/state/AppDataProvider";
import { useFeelings } from "@/features/checkins/useFeelings";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** A glanceable summary of one week — the landing page for the Sunday
 *  review notification. */
export function WeekReviewView() {
  const { tasks, checkIns, goals, goalEntries, memories, settings } = useAppData();
  const { toneOf } = useFeelings();
  const [offset, setOffset] = useState(0); // weeks back from the current one

  const week = useMemo(() => {
    const start = addDays(startOfWeek(new Date(), settings.weekStartsOn), offset * 7);
    const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
    return { start: days[0], end: days[6], days };
  }, [offset, settings.weekStartsOn]);

  const inWeek = (date: string) => date >= week.start && date <= week.end;
  const today = todayKey();

  const done = useMemo(() => tasks.filter((t) => t.completed && !t.isLabel && inWeek(t.date)), [tasks, week]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneByDay = week.days.map((d) => done.filter((t) => t.date === d).length);

  const weekCheckIns = useMemo(() => checkIns.filter((c) => inWeek(c.date)), [checkIns, week]); // eslint-disable-line react-hooks/exhaustive-deps
  const checkedDays = new Set(weekCheckIns.map((c) => c.date));
  const feelingCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of weekCheckIns) for (const w of c.feelings) m.set(w, (m.get(w) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [weekCheckIns]);
  const gratitudes = week.days
    .map((d) => {
      const g = weekCheckIns.filter((c) => c.date === d).flatMap((c) => c.gratitude).find((x) => x.trim());
      return g ? { date: d, text: g } : null;
    })
    .filter((x): x is { date: string; text: string } => !!x);

  const goalRows = goals
    .filter((g) => !g.archived && (g.year ?? Number(g.startedAt.slice(0, 4))) === Number(week.start.slice(0, 4)))
    .map((g) => {
      const entries = goalEntries.filter((e) => e.goalId === g.id && inWeek(e.date) && e.count > 0);
      const count = entries.reduce((s, e) => s + e.count, 0);
      const days = new Set(entries.map((e) => e.date)).size;
      return g.cadence === "day"
        ? { id: g.id, title: g.title, value: `${days}/7 days`, met: days >= 7 }
        : g.cadence === "week"
          ? { id: g.id, title: g.title, value: `${count}/${g.target}`, met: count >= g.target }
          : { id: g.id, title: g.title, value: `${count} this week`, met: count > 0 };
    });

  const weekMemories = memories.filter((m) => inWeek(m.occurredOn));

  const label = `${formatLongDate(week.start).replace(/^\w+, /, "")} – ${formatLongDate(week.end).replace(/^\w+, /, "")}`;
  const isCurrent = offset === 0;
  const empty = done.length === 0 && weekCheckIns.length === 0 && weekMemories.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={isCurrent ? "THIS WEEK" : "WEEK"}>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="Previous week" className="rounded-md p-1 text-muted hover:text-ink">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-muted">{label}</span>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={isCurrent} aria-label="Next week" className="rounded-md p-1 text-muted hover:text-ink disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </PageHeader>

      <Screen>
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
          {empty ? (
            <p className="py-16 text-center text-sm text-faint">Nothing logged this week yet.</p>
          ) : (
            <>
              <Card title="Done">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-3xl font-bold leading-none text-ink">{done.length}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">tasks completed</div>
                  </div>
                  <div className="flex items-end gap-1.5">
                    {doneByDay.map((n, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-5 items-end rounded-[3px] bg-sand">
                          <div className="w-full rounded-[3px] bg-brand-500" style={{ height: `${Math.min(100, (n / Math.max(1, ...doneByDay)) * 100)}%` }} />
                        </div>
                        <span className={cn("text-[9px] font-semibold", week.days[i] === today ? "text-brand-600" : "text-faint")}>{DAY_LETTERS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {done.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted">
                    {done.slice(0, 8).map((t) => (
                      <li key={t.id} className="truncate">· {t.text}</li>
                    ))}
                    {done.length > 8 && <li className="text-xs text-faint">and {done.length - 8} more</li>}
                  </ul>
                )}
              </Card>

              <Card title={`Check-ins · ${checkedDays.size}/7 days`}>
                {feelingCounts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {feelingCounts.map(([w, n]) => (
                      <span
                        key={w}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs",
                          toneOf(w) === "down" ? "bg-amber-700/10 text-amber-800" : toneOf(w) === "flat" ? "bg-ink/5 text-muted" : "bg-brand-500/10 text-brand-700",
                        )}
                      >
                        {w} <span className="font-bold">{n}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-faint">No check-ins this week.</p>
                )}
                {gratitudes.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {gratitudes.map((g) => (
                      <li key={g.date} className="flex gap-2 text-sm">
                        <span className="w-8 shrink-0 text-[11px] font-semibold uppercase text-faint">{formatLongDate(g.date).slice(0, 3)}</span>
                        <span className="text-ink">{g.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {goalRows.length > 0 && (
                <Card title="Goals">
                  <ul className="space-y-1.5">
                    {goalRows.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink">{g.title}</span>
                        <span className={cn("shrink-0 font-mono text-xs font-bold", g.met ? "text-brand-600" : "text-muted")}>{g.value}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {weekMemories.length > 0 && (
                <Card title={`Memories · ${weekMemories.length}`}>
                  <ul className="space-y-1 text-sm text-muted">
                    {weekMemories.map((m) => (
                      <li key={m.id} className="truncate">
                        {m.milestone ? "★ " : "· "}{m.title || m.body || m.quoteAuthor || "Memory"}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <p className="px-1 text-xs text-faint">
                <Link href="/check-ins" className="text-brand-600 hover:underline">Patterns</Link> for the bigger picture ·{" "}
                <Link href="/wrapped" className="text-brand-600 hover:underline">Wrapped</Link> for the year.
              </p>
            </>
          )}
        </div>
      </Screen>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">{title}</h2>
      {children}
    </section>
  );
}
