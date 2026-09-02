"use client";

import { cn } from "@/lib/utils/cn";
import { usePatterns, type Split } from "./usePatterns";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Descriptive read-outs of the year's check-ins — no scores, no advice. */
export function PatternsPanel({ year }: { year: number }) {
  const p = usePatterns(year);

  if (!p.enough) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <h2 className="text-sm font-semibold text-ink">Not enough days yet</h2>
        <p className="mt-1 text-sm text-muted">
          Patterns need at least a week of check-ins in {year} — you have{" "}
          {p.dayCount} so far.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
      <p className="px-1 text-sm text-muted">
        {p.dayCount} days checked in during {year}. Across them,{" "}
        <span className="font-semibold text-ink">{p.overallUp}%</span> of the
        feelings you picked were upbeat ones.
      </p>

      {/* Mood by month */}
      <Card title="Mood by month">
        <div className="flex items-end gap-1.5">
          {p.byMonth.map((m) => {
            const t = m.tone;
            const pct = (n: number) => (t.total ? (n / t.total) * 100 : 0);
            return (
              <div key={m.month} className="group/m relative flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full flex-col-reverse overflow-hidden rounded-[3px] bg-sand">
                  {t.total > 0 && (
                    <>
                      <div className="w-full bg-brand-500" style={{ height: `${pct(t.up)}%` }} />
                      <div className="w-full bg-ink/25" style={{ height: `${pct(t.flat)}%` }} />
                      <div className="w-full bg-amber-700/60" style={{ height: `${pct(t.down)}%` }} />
                    </>
                  )}
                </div>
                <span className="text-[9px] font-medium text-faint">{MONTH_LETTERS[m.month]}</span>
                {t.total > 0 && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] text-white group-hover/m:block">
                    {MONTHS[m.month]} · {m.days} days · mostly {m.top}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Legend />
        <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {p.byMonth
            .filter((m) => m.top)
            .map((m) => (
              <div key={m.month} className="flex justify-between gap-2">
                <span className="text-faint">{MONTHS[m.month]}</span>
                <span className="truncate text-ink">{m.top}</span>
              </div>
            ))}
        </div>
      </Card>

      {/* Through the week */}
      <Card title="Through the week">
        <div className="space-y-1.5">
          {p.byWeekday.map((d) => (
            <div key={d.dow} className="flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0 font-semibold uppercase text-faint">{d.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${d.up}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right font-mono font-semibold text-ink">
                {d.days ? `${d.up}%` : "—"}
              </span>
              <span className="hidden w-40 shrink-0 truncate text-muted sm:block">
                {d.top.join(", ")}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-faint">Share of upbeat feelings, with the words you reached for most.</p>
      </Card>

      {/* Splits */}
      {p.splits.length > 0 && (
        <Card title="On days you…">
          <div className="space-y-4">
            {p.splits.map((s) => (
              <SplitRow key={s.label} split={s} />
            ))}
          </div>
        </Card>
      )}

      {/* Gratitude themes */}
      {p.themes.length > 0 && (
        <Card title="What you kept being grateful for">
          <div className="flex flex-wrap gap-1.5">
            {p.themes.map(([word, n]) => (
              <span
                key={word}
                className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs text-brand-800"
              >
                {word} <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
            {p.themesByMonth.map((words, m) =>
              words.length ? (
                <div key={m} className="flex gap-2">
                  <span className="w-8 shrink-0 text-faint">{MONTHS[m]}</span>
                  <span className="truncate text-muted">{words.join(", ")}</span>
                </div>
              ) : null,
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function SplitRow({ split: s }: { split: Split }) {
  const diff = s.withUp - s.withoutUp;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{s.label}</span>
        <span className="text-[11px] text-faint">
          {s.withDays} days vs {s.withoutDays} without
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Half label="those days" up={s.withUp} words={s.withTop} strong={diff >= 0} />
        <Half label="other days" up={s.withoutUp} words={s.withoutTop} strong={diff < 0} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {Math.abs(diff) < 5
          ? "About the same either way."
          : `${Math.abs(diff)} points ${diff > 0 ? "more" : "fewer"} upbeat feelings on those days.`}
      </p>
    </div>
  );
}

function Half({
  label,
  up,
  words,
  strong,
}: {
  label: string;
  up: number;
  words: string[];
  strong: boolean;
}) {
  return (
    <div className={cn("rounded-xl border p-2.5", strong ? "border-brand-300 bg-brand-50/50" : "border-line")}>
      <div className="flex items-baseline justify-between">
        <span className="uppercase tracking-wide text-faint">{label}</span>
        <span className="font-mono text-sm font-bold text-ink">{up}%</span>
      </div>
      <div className="mt-1 truncate text-muted">{words.join(", ") || "—"}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex gap-3 text-[10px] text-faint">
      <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-brand-500" /> upbeat</span>
      <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-ink/25" /> neutral</span>
      <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-700/60" /> difficult</span>
    </div>
  );
}
