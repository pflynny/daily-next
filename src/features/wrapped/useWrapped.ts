"use client";

import { useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { buildMemories } from "@/state/selectors";
import { addDays, fromDateKey, toDateKey } from "@/lib/utils/date";
import type {
  CollectionItem,
  GarminYearSummary,
  MemoryView,
  PeaksYearSummary,
} from "@/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface WrappedData {
  year: number;
  tasks: {
    completed: number;
    total: number;
    completionRate: number;
    busiestMonth: string | null;
    busiestMonthCount: number;
    activeDays: number;
    longestStreak: number;
    monthly: number[];
  };
  goals: {
    tracked: number;
    checkIns: number;
    topGoal: { title: string; count: number } | null;
  };
  collection: {
    total: number;
    byType: { label: string; count: number }[];
    topRated: CollectionItem[];
  };
  memories: {
    count: number;
    photos: MemoryView[];
  };
  quotes: {
    count: number;
    featured: { text: string; author: string } | null;
  };
  feelings: {
    /** days with at least one check-in */
    daysCheckedIn: number;
    /** [word, count] sorted by count desc */
    counts: [string, number][];
  };
  gratitude: {
    /** the top (first) thing from each evening, oldest first */
    entries: { date: string; text: string }[];
  };
  /** imported fitness data (Garmin export / cairnbook backup), if any */
  fitness: {
    garmin: GarminYearSummary | null;
    peaks: PeaksYearSummary | null;
  } | null;
  /** combined per-day activity for the heatmap */
  activity: Map<string, number>;
  activityMax: number;
}

export function useWrapped(year: number): WrappedData {
  const {
    tasks,
    goals,
    goalEntries,
    collections,
    collectionItems,
    memories,
    memoryMedia,
    likedQuotes,
    checkIns,
    fitnessYears,
  } = useAppData();

  return useMemo(() => {
    const prefix = `${year}-`;
    const activity = new Map<string, number>();
    const bump = (key: string, n = 1) =>
      activity.set(key, (activity.get(key) ?? 0) + n);

    // ---- tasks ----
    const monthly = Array.from({ length: 12 }, () => 0);
    let completed = 0;
    let total = 0;
    const activeDaySet = new Set<string>();
    for (const t of tasks) {
      if (t.isLabel || !t.date.startsWith(prefix)) continue;
      total += 1;
      if (t.completed) {
        completed += 1;
        const m = Number(t.date.slice(5, 7)) - 1;
        if (m >= 0 && m < 12) monthly[m] += 1;
        activeDaySet.add(t.date);
        bump(t.date);
      }
    }
    let busiestMonthCount = 0;
    let busiestIdx = -1;
    monthly.forEach((c, i) => {
      if (c > busiestMonthCount) {
        busiestMonthCount = c;
        busiestIdx = i;
      }
    });
    // longest streak of active days
    const sortedDays = [...activeDaySet].sort();
    let longestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of sortedDays) {
      if (prev && toDateKey(addDays(fromDateKey(prev), 1)) === d) run += 1;
      else run = 1;
      longestStreak = Math.max(longestStreak, run);
      prev = d;
    }

    // ---- goals ----
    const perGoal = new Map<string, number>();
    let goalCheckIns = 0;
    for (const e of goalEntries) {
      if (!e.date.startsWith(prefix)) continue;
      goalCheckIns += e.count;
      perGoal.set(e.goalId, (perGoal.get(e.goalId) ?? 0) + e.count);
      bump(e.date, e.count);
    }
    let topGoal: WrappedData["goals"]["topGoal"] = null;
    for (const [goalId, count] of perGoal) {
      if (!topGoal || count > topGoal.count) {
        const g = goals.find((x) => x.id === goalId);
        if (g) topGoal = { title: g.title, count };
      }
    }

    // ---- collections ----
    // Count per collection (matching the Year tab) rather than per item
    // media type, so a mislabeled item can't skew the numbers.
    const yearCollections = collections.filter((c) => c.year === year);
    const yearCollectionIds = new Set(yearCollections.map((c) => c.id));
    const items = collectionItems.filter((i) =>
      yearCollectionIds.has(i.collectionId),
    );
    const byType = yearCollections
      .map((c) => ({
        label: c.name,
        count: items.filter((i) => i.collectionId === c.id).length,
      }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
    const topRated = [...items]
      .filter((i) => typeof i.rating === "number")
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);

    // ---- memories ----
    const timeline = buildMemories(memories, memoryMedia);
    const yearMemories = timeline.filter((m) => m.occurredOn.startsWith(prefix));
    for (const m of yearMemories) bump(m.occurredOn);
    const photos = yearMemories
      .filter((m) => m.media.some((md) => md.kind === "image"))
      .slice(0, 6);

    // ---- check-ins: feelings + gratitude ----
    const feelingCounts = new Map<string, number>();
    const checkedInDays = new Set<string>();
    const gratitudeEntries: { date: string; text: string }[] = [];
    for (const c of checkIns) {
      if (!c.date.startsWith(prefix)) continue;
      checkedInDays.add(c.date);
      bump(c.date);
      for (const w of c.feelings) {
        feelingCounts.set(w, (feelingCounts.get(w) ?? 0) + 1);
      }
      const top = c.gratitude.find((g) => g.trim());
      if (c.kind === "evening" && top) {
        gratitudeEntries.push({ date: c.date, text: top });
      }
    }
    gratitudeEntries.sort((a, b) => (a.date < b.date ? -1 : 1));
    const feelingsSorted = [...feelingCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    // ---- quotes ----
    const featured =
      likedQuotes.length > 0
        ? likedQuotes[Math.floor(likedQuotes.length / 2)]
        : null;

    // ---- imported fitness (Garmin / cairnbook) ----
    const fitnessRow = fitnessYears.find((f) => f.year === year);
    const fitness =
      fitnessRow && (fitnessRow.garmin || fitnessRow.peaks)
        ? { garmin: fitnessRow.garmin, peaks: fitnessRow.peaks }
        : null;

    const activityMax = Math.max(1, ...activity.values());

    return {
      year,
      tasks: {
        completed,
        total,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
        busiestMonth: busiestIdx >= 0 ? MONTHS[busiestIdx] : null,
        busiestMonthCount,
        activeDays: activeDaySet.size,
        longestStreak,
        monthly,
      },
      goals: {
        tracked: goals.filter((g) => (g.year ?? Number(g.startedAt.slice(0, 4))) === year).length,
        checkIns: goalCheckIns,
        topGoal,
      },
      collection: { total: items.length, byType, topRated },
      memories: { count: yearMemories.length, photos },
      quotes: {
        count: likedQuotes.length,
        featured: featured
          ? { text: featured.text, author: featured.author }
          : null,
      },
      feelings: {
        daysCheckedIn: checkedInDays.size,
        counts: feelingsSorted,
      },
      gratitude: { entries: gratitudeEntries },
      fitness,
      activity,
      activityMax,
    };
  }, [
    year,
    tasks,
    goals,
    goalEntries,
    collections,
    collectionItems,
    memories,
    memoryMedia,
    likedQuotes,
    checkIns,
    fitnessYears,
  ]);
}
