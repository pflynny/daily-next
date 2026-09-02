"use client";

import { useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { fromDateKey } from "@/lib/utils/date";
import { useFeelings } from "./useFeelings";
import type { FeelingTone } from "./feelings";

/**
 * Descriptive mood patterns for a year: how feelings spread across months
 * and weekdays, how they differ on days with goal activity or a lot of
 * tasks done, and what gratitude entries keep coming back to.
 */

const MIN_DAYS = 5;

const STOPWORDS = new Set(
  `a an the and or but so to of in on at for with from by as is it its it's be
   was were are am been being have has had do did done get got going went
   this that these those there here my me i we our us you your they them
   their he she his her him not no yes very really just also too more some
   all any into over after before about up out off than then when what
   which who how would could should will can one two lots lot bit
   day today tonight morning evening night good great nice lovely fun
   time made make having had having`.split(/\s+/),
);

export interface ToneShare {
  up: number;
  flat: number;
  down: number;
  total: number;
}

export interface Split {
  label: string;
  withDays: number;
  withoutDays: number;
  withUp: number; // % up-tone words on those days
  withoutUp: number;
  withTop: string[];
  withoutTop: string[];
}

function share(counts: ToneShare): number {
  return counts.total ? Math.round((counts.up / counts.total) * 100) : 0;
}

function topWords(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

export function usePatterns(year: number) {
  const { checkIns, tasks, goals, goalEntries } = useAppData();
  const { toneOf } = useFeelings();

  return useMemo(() => {
    const prefix = `${year}-`;

    // date -> merged feelings + gratitude for the day
    const days = new Map<string, { feelings: string[]; gratitude: string[] }>();
    for (const c of checkIns) {
      if (!c.date.startsWith(prefix)) continue;
      const d = days.get(c.date) ?? { feelings: [], gratitude: [] };
      d.feelings.push(...c.feelings);
      d.gratitude.push(...c.gratitude.filter((g) => g.trim()));
      days.set(c.date, d);
    }
    const dayCount = days.size;

    const tally = (dates: Iterable<string>) => {
      const tone: ToneShare = { up: 0, flat: 0, down: 0, total: 0 };
      const words = new Map<string, number>();
      for (const date of dates) {
        for (const w of days.get(date)?.feelings ?? []) {
          const t: FeelingTone = toneOf(w) ?? "flat";
          tone[t] += 1;
          tone.total += 1;
          words.set(w, (words.get(w) ?? 0) + 1);
        }
      }
      return { tone, words };
    };

    // ---- by month ----
    const byMonth = Array.from({ length: 12 }, (_, m) => {
      const mm = String(m + 1).padStart(2, "0");
      const dates = [...days.keys()].filter((d) => d.startsWith(`${prefix}${mm}`));
      const { tone, words } = tally(dates);
      return { month: m, days: dates.length, tone, top: topWords(words, 1)[0] ?? null };
    });

    // ---- by weekday (Mon..Sun) ----
    const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
      const dates = [...days.keys()].filter((d) => fromDateKey(d).getDay() === dow);
      const { tone, words } = tally(dates);
      return {
        dow,
        label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
        days: dates.length,
        up: share(tone),
        top: topWords(words, 2),
      };
    });

    // ---- splits: goal days vs not, busy days vs not ----
    const splits: Split[] = [];
    const makeSplit = (label: string, withSet: Set<string>): Split | null => {
      const withDates = [...days.keys()].filter((d) => withSet.has(d));
      const withoutDates = [...days.keys()].filter((d) => !withSet.has(d));
      if (withDates.length < MIN_DAYS || withoutDates.length < MIN_DAYS) return null;
      const a = tally(withDates);
      const b = tally(withoutDates);
      return {
        label,
        withDays: withDates.length,
        withoutDays: withoutDates.length,
        withUp: share(a.tone),
        withoutUp: share(b.tone),
        withTop: topWords(a.words, 3),
        withoutTop: topWords(b.words, 3),
      };
    };

    for (const g of goals) {
      const gYear = g.year ?? Number(g.startedAt.slice(0, 4));
      if (gYear !== year) continue;
      const active = new Set(
        goalEntries
          .filter((e) => e.goalId === g.id && e.count > 0 && e.date.startsWith(prefix))
          .map((e) => e.date),
      );
      const s = makeSplit(g.title, active);
      if (s) splits.push(s);
    }

    const doneByDate = new Map<string, number>();
    for (const t of tasks) {
      if (t.completed && !t.isLabel && t.date.startsWith(prefix)) {
        doneByDate.set(t.date, (doneByDate.get(t.date) ?? 0) + 1);
      }
    }
    const busy = new Set([...doneByDate.entries()].filter(([, n]) => n >= 4).map(([d]) => d));
    const busySplit = makeSplit("4+ tasks done", busy);
    if (busySplit) splits.push(busySplit);

    // ---- gratitude themes ----
    const themeCounts = new Map<string, number>();
    const themeByMonth = Array.from({ length: 12 }, () => new Map<string, number>());
    for (const [date, d] of days) {
      const m = Number(date.slice(5, 7)) - 1;
      for (const g of d.gratitude) {
        const seen = new Set<string>();
        for (const raw of g.toLowerCase().split(/[^a-z']+/)) {
          const w = raw.replace(/^'+|'+$/g, "");
          if (w.length < 3 || STOPWORDS.has(w) || seen.has(w)) continue;
          seen.add(w);
          themeCounts.set(w, (themeCounts.get(w) ?? 0) + 1);
          themeByMonth[m].set(w, (themeByMonth[m].get(w) ?? 0) + 1);
        }
      }
    }
    const themes = [...themeCounts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18);
    const themesByMonth = themeByMonth.map((m) => topWords(m, 3));

    const overall = tally(days.keys());

    return {
      dayCount,
      enough: dayCount >= 7,
      overallUp: share(overall.tone),
      byMonth,
      byWeekday,
      splits,
      themes,
      themesByMonth,
    };
  }, [year, checkIns, tasks, goals, goalEntries, toneOf]);
}
