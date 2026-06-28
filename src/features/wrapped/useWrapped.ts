"use client";

import { useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { buildMemories } from "@/state/selectors";
import { addDays, fromDateKey, toDateKey } from "@/lib/utils/date";
import type { CollectionItem, MemoryView } from "@/types";

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
    let checkIns = 0;
    for (const e of goalEntries) {
      if (!e.date.startsWith(prefix)) continue;
      checkIns += e.count;
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
    const yearCollectionIds = new Set(
      collections.filter((c) => c.year === year).map((c) => c.id),
    );
    const items = collectionItems.filter((i) =>
      yearCollectionIds.has(i.collectionId),
    );
    const typeCounts = new Map<string, number>();
    for (const it of items)
      typeCounts.set(it.mediaType, (typeCounts.get(it.mediaType) ?? 0) + 1);
    const typeLabels: Record<string, string> = {
      book: "Books",
      movie: "Movies",
      tv: "TV shows",
      music: "Music",
      other: "Other",
    };
    const byType = [...typeCounts.entries()]
      .map(([k, count]) => ({ label: typeLabels[k] ?? k, count }))
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

    // ---- quotes ----
    const featured =
      likedQuotes.length > 0
        ? likedQuotes[Math.floor(likedQuotes.length / 2)]
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
      goals: { tracked: goals.length, checkIns, topGoal },
      collection: { total: items.length, byType, topRated },
      memories: { count: yearMemories.length, photos },
      quotes: {
        count: likedQuotes.length,
        featured: featured
          ? { text: featured.text, author: featured.author }
          : null,
      },
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
  ]);
}
