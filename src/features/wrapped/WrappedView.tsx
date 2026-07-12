"use client";

import { useRef, useState } from "react";
import { toSvg } from "html-to-image";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { YearPicker } from "@/shared/ui/YearPicker";
import { DownloadIcon } from "@/shared/ui/icons";
import { DailyHeatmap } from "@/features/goals/DailyHeatmap";
import { TONE_OF } from "@/features/checkins/feelings";
import { formatLongDate } from "@/lib/utils/date";
import { useWrapped } from "./useWrapped";
import type { GarminYearSummary, PeaksYearSummary } from "@/types";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function WrappedView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const w = useWrapped(year);
  const shotRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const monthlyMax = Math.max(1, ...w.tasks.monthly);
  const hasData =
    w.tasks.total > 0 ||
    w.goals.checkIns > 0 ||
    w.collection.total > 0 ||
    w.memories.count > 0 ||
    w.fitness !== null;

  async function saveImage() {
    const node = shotRef.current;
    if (!node || exporting) return;
    setExporting(true);
    // The fade-rise entrance animations restart inside the capture and
    // rasterize at frame zero (opacity 0) — suppress them while cloning.
    const freeze = document.createElement("style");
    freeze.textContent =
      "[data-exporting], [data-exporting] * { animation: none !important; transition: none !important; }";
    document.head.appendChild(freeze);
    node.setAttribute("data-exporting", "");
    // Let the style apply — rAF when visible, timer fallback when the tab
    // is backgrounded (rAF doesn't fire there).
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(finish));
      setTimeout(finish, 200);
    });
    try {
      // html-to-image's own rasterizer stalls on large captures, so take
      // its SVG serialization and draw it to a canvas ourselves.
      const svgUrl = await toSvg(node, {
        backgroundColor: "#faf9f5",
        // keep broken/cross-origin images from aborting the whole export
        imagePlaceholder:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      });
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("could not render the capture"));
        img.src = svgUrl;
      });
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = node.offsetWidth * scale;
      canvas.height = node.offsetHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#faf9f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `daily-wrapped-${year}.png`;
      a.click();
    } catch (err) {
      console.error("Wrapped export failed", err);
    } finally {
      node.removeAttribute("data-exporting");
      freeze.remove();
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="WRAPPED">
        <YearPicker year={year} onChange={setYear} max={currentYear} />
        <button
          onClick={saveImage}
          disabled={exporting}
          aria-label="Save as image"
          title="Save as image"
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink disabled:opacity-50"
        >
          <DownloadIcon size={15} />
          {exporting ? "Saving…" : "Image"}
        </button>
      </PageHeader>

      <Screen>
        <div ref={shotRef} className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
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

          {/* 1 — Memories */}
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

          {/* 2 — Grateful for */}
          {w.gratitude.entries.length > 0 && (
            <GratitudeSection entries={w.gratitude.entries} year={year} />
          )}

          {/* 3 — How you felt */}
          {w.feelings.counts.length > 0 && (
            <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
              <SectionLabel>How you felt</SectionLabel>
              <Big value={w.feelings.daysCheckedIn} label="Days checked in" />
              <div className="mt-4 flex flex-wrap gap-1.5">
                {w.feelings.counts.slice(0, 20).map(([word, count]) => (
                  <span
                    key={word}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      TONE_OF.get(word) === "down"
                        ? "bg-amber-700/10 text-amber-800"
                        : TONE_OF.get(word) === "flat"
                          ? "bg-ink/5 text-muted"
                          : "bg-brand-500/10 text-brand-700",
                    )}
                  >
                    {word} <span className="font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 4 — Read & watched */}
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

          {/* 5 — Goals */}
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

          {/* 6 — Every day heatmap */}
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

          {/* 7 — The body: imported Garmin + cairnbook data */}
          {w.fitness && (
            <FitnessSection garmin={w.fitness.garmin} peaks={w.fitness.peaks} />
          )}

          {/* 8 — Tasks */}
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

/* ------------------------- The body ------------------------------- */

const LIST_LABELS: Record<string, string> = {
  wainwrights: "Wainwrights",
  munros: "Munros",
  corbetts: "Corbetts",
  hewitts: "Hewitts",
  donalds: "Donalds",
  fionas: "Fionas",
  sub2000: "Marilyns",
  islands: "island peaks",
};

const AVG_STRIDE_M = 0.75;
const EVEREST_M = 8849;

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-GB");

/** 27000 -> "7h 30m" */
function hoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Big-stat friendly step count: 1890244 -> "1.89M", 425100 -> "425k" */
function compactSteps(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  return fmtInt(n);
}

/** { wainwrights: 29, munros: 8 } -> "29 Wainwrights and 8 Munros" */
function peaksPhrase(byList: Record<string, number>): string {
  const parts = Object.entries(byList)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, n]) => `${n} ${LIST_LABELS[slug] ?? slug}`);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function FitnessSection({
  garmin,
  peaks,
}: {
  garmin: GarminYearSummary | null;
  peaks: PeaksYearSummary | null;
}) {
  const acts = garmin?.activities ?? null;

  const bigs: { value: string | number; label: string }[] = [];
  if (peaks) bigs.push({ value: peaks.total, label: "Summits bagged" });
  if (acts && acts.run.km >= 1)
    bigs.push({ value: fmtInt(acts.run.km), label: "Km run" });
  if (acts && acts.ride.km >= 1)
    bigs.push({ value: fmtInt(acts.ride.km), label: "Km ridden" });
  if (acts && acts.walkHike.km >= 1)
    bigs.push({ value: fmtInt(acts.walkHike.km), label: "Km walked" });
  if (garmin?.steps)
    bigs.push({ value: compactSteps(garmin.steps.total), label: "Steps" });
  if (garmin?.sleep)
    bigs.push({
      value: hoursMinutes(garmin.sleep.avgSeconds),
      label: "Sleep a night",
    });

  const lines: string[] = [];
  if (peaks && Object.keys(peaks.byList).length > 0) {
    lines.push(`${peaksPhrase(peaks.byList)} ticked.`);
  }
  if (garmin?.steps) {
    const km = (garmin.steps.total * AVG_STRIDE_M) / 1000;
    lines.push(
      `${fmtInt(garmin.steps.total)} steps — roughly ${fmtInt(km)} km on foot.`,
    );
  }
  if (garmin?.sleep) {
    lines.push(
      `${fmtInt(garmin.sleep.totalSeconds / 3600)} hours asleep across ${fmtInt(garmin.sleep.nights)} nights.`,
    );
  }
  if (garmin?.rhr) {
    const { startAvg, endAvg, delta, low } = garmin.rhr;
    const trend =
      delta < 0
        ? `down ${Math.abs(delta)} bpm over the year`
        : delta > 0
          ? `up ${delta} bpm over the year`
          : "steady all year";
    lines.push(
      `Resting heart rate ${startAvg} → ${endAvg} bpm — ${trend} (lowest ${low}).`,
    );
  }
  if (acts && acts.total.ascentM >= EVEREST_M) {
    lines.push(
      `${fmtInt(acts.total.ascentM)} m climbed in total — ${(acts.total.ascentM / EVEREST_M).toFixed(1)} Everests.`,
    );
  }

  return (
    <section className="animate-fade-rise rounded-3xl border border-line bg-surface p-6">
      <SectionLabel>The body</SectionLabel>
      {bigs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {bigs.map((b) => (
            <Big key={b.label} value={b.value} label={b.label} />
          ))}
        </div>
      )}
      {lines.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {lines.map((line) => (
            <p key={line} className="text-sm text-muted">
              {line}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function GratitudeSection({
  entries,
  year,
}: {
  entries: { date: string; text: string }[];
  year: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(-8);
  return (
    <section className="animate-fade-rise rounded-3xl bg-brand-700 p-6 text-brand-50">
      <SectionLabel dark>Grateful for</SectionLabel>
      <Big value={entries.length} label={`Things in ${year}`} dark />
      <ul className="mt-4 space-y-1.5">
        {visible.map((e) => (
          <li key={e.date} className="flex items-baseline gap-3 text-sm">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-brand-200">
              {formatLongDate(e.date)}
            </span>
            <span className="min-w-0 text-brand-50">{e.text}</span>
          </li>
        ))}
      </ul>
      {entries.length > 8 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 w-full rounded-lg border border-brand-500/60 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 hover:bg-brand-600/40"
        >
          {showAll ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      )}
    </section>
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
