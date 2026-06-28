"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { newId } from "@/lib/utils/id";
import {
  addDays,
  fromDateKey,
  startOfWeek,
  toDateKey,
  todayKey,
  weekKey,
} from "@/lib/utils/date";
import type { Goal, GoalCadence, GoalEntry } from "@/types";

export interface GoalStats {
  /** count in the current period (today / this week / this month) */
  current: number;
  /** total ticks this year */
  total: number;
  currentStreak: number;
  bestStreak: number;
  /** completed-day count vs days-elapsed score, 0..10 */
  score: number;
}

export function useGoals() {
  const { goals, goalEntries, settings, put, del } = useAppData();
  const weekStartsOn = settings.weekStartsOn;

  const active = useMemo(
    () =>
      goals
        .filter((g) => !g.archived)
        .sort((a, b) => a.position - b.position),
    [goals],
  );

  const archived = useMemo(
    () => goals.filter((g) => g.archived).sort((a, b) => a.position - b.position),
    [goals],
  );

  /** goalId -> (dateKey -> count) */
  const entriesByGoal = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of goalEntries) {
      let inner = map.get(e.goalId);
      if (!inner) {
        inner = new Map();
        map.set(e.goalId, inner);
      }
      inner.set(e.date, (inner.get(e.date) ?? 0) + e.count);
    }
    return map;
  }, [goalEntries]);

  const datesFor = useCallback(
    (goalId: string) => entriesByGoal.get(goalId) ?? new Map<string, number>(),
    [entriesByGoal],
  );

  // ---- mutations -----------------------------------------------------------
  const addGoal = useCallback(
    (input: { title: string; cadence: GoalCadence; target: number }) => {
      const title = input.title.trim();
      if (!title) return;
      const now = new Date().toISOString();
      put("goals", [
        {
          id: newId(),
          title,
          cadence: input.cadence,
          target: Math.max(1, input.target),
          color: null,
          position: active.length,
          archived: false,
          startedAt: now,
          createdAt: now,
        },
      ]);
    },
    [active.length, put],
  );

  const updateGoal = useCallback(
    (goal: Goal, patch: Partial<Goal>) => put("goals", [{ ...goal, ...patch }]),
    [put],
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      const entryIds = goalEntries
        .filter((e) => e.goalId === goalId)
        .map((e) => e.id);
      if (entryIds.length) del("goalEntries", entryIds);
      del("goals", [goalId]);
    },
    [goalEntries, del],
  );

  const moveGoal = useCallback(
    (goalId: string, dir: -1 | 1) => {
      const i = active.findIndex((g) => g.id === goalId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= active.length) return;
      const ordered = [...active];
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      put("goals", ordered.map((g, idx) => ({ ...g, position: idx })));
    },
    [active, put],
  );

  /** Set today's (or a given day's) count to an absolute value. */
  const setCount = useCallback(
    (goalId: string, dateKey: string, count: number) => {
      const existing = goalEntries.find(
        (e) => e.goalId === goalId && e.date === dateKey,
      );
      if (count <= 0) {
        if (existing) del("goalEntries", [existing.id]);
        return;
      }
      const row: GoalEntry = existing
        ? { ...existing, count }
        : { id: newId(), goalId, date: dateKey, count };
      put("goalEntries", [row]);
    },
    [goalEntries, put, del],
  );

  /** Toggle a daily-habit day on/off. */
  const toggleDay = useCallback(
    (goalId: string, dateKey: string) => {
      const has = (datesFor(goalId).get(dateKey) ?? 0) > 0;
      setCount(goalId, dateKey, has ? 0 : 1);
    },
    [datesFor, setCount],
  );

  /** Add/subtract a tick for a frequency goal on a given day (default today). */
  const tick = useCallback(
    (goalId: string, delta: 1 | -1, dateKey = todayKey()) => {
      const current = datesFor(goalId).get(dateKey) ?? 0;
      setCount(goalId, dateKey, current + delta);
    },
    [datesFor, setCount],
  );

  // ---- stats ---------------------------------------------------------------
  const periodCount = useCallback(
    (goalId: string, cadence: GoalCadence, ref: Date): number => {
      const entries = datesFor(goalId);
      if (cadence === "day") return entries.get(toDateKey(ref)) ?? 0;
      let sum = 0;
      if (cadence === "week") {
        const wk = weekKey(ref, weekStartsOn);
        for (const [dk, c] of entries) {
          if (weekKey(fromDateKey(dk), weekStartsOn) === wk) sum += c;
        }
      } else {
        const ym = toDateKey(ref).slice(0, 7);
        for (const [dk, c] of entries) if (dk.slice(0, 7) === ym) sum += c;
      }
      return sum;
    },
    [datesFor, weekStartsOn],
  );

  const statsFor = useCallback(
    (goal: Goal, year: number): GoalStats => {
      const entries = datesFor(goal.id);
      const yearPrefix = `${year}-`;
      const yearKeys = [...entries.keys()]
        .filter((k) => k.startsWith(yearPrefix) && (entries.get(k) ?? 0) > 0)
        .sort();
      const total = yearKeys.reduce((s, k) => s + (entries.get(k) ?? 0), 0);

      // streaks measured in days with any activity
      const daySet = new Set(yearKeys);
      const today = new Date();
      let currentStreak = 0;
      let cursor = new Date(today);
      while (daySet.has(toDateKey(cursor))) {
        currentStreak += 1;
        cursor = addDays(cursor, -1);
      }
      let bestStreak = 0;
      let run = 0;
      let prev: string | null = null;
      for (const k of yearKeys) {
        if (prev && toDateKey(addDays(fromDateKey(prev), 1)) === k) run += 1;
        else run = 1;
        bestStreak = Math.max(bestStreak, run);
        prev = k;
      }

      const current = periodCount(goal.id, goal.cadence, new Date());

      // score: progress against the days elapsed this year
      const start = new Date(year, 0, 1);
      const end = year === today.getFullYear() ? today : new Date(year, 11, 31);
      const daysElapsed = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
      );
      let score = 0;
      if (goal.cadence === "day") {
        score = (daySet.size / daysElapsed) * 10;
      } else {
        const perDayTarget =
          goal.cadence === "week" ? goal.target / 7 : goal.target / 30;
        const expected = perDayTarget * daysElapsed;
        score = expected > 0 ? Math.min(10, (total / expected) * 10) : 0;
      }

      return {
        current,
        total,
        currentStreak,
        bestStreak,
        score: Math.round(score * 10) / 10,
      };
    },
    [datesFor, periodCount],
  );

  /** Last `count` periods (oldest..newest) with met/target info. */
  const periodHistory = useCallback(
    (goal: Goal, count: number) => {
      const out: { label: string; value: number; met: boolean; key: string }[] =
        [];
      const today = new Date();
      for (let i = count - 1; i >= 0; i -= 1) {
        let ref: Date;
        let label: string;
        let key: string;
        if (goal.cadence === "week") {
          ref = startOfWeek(addDays(today, -i * 7), weekStartsOn);
          key = weekKey(ref, weekStartsOn);
          label = `${ref.getDate()}/${ref.getMonth() + 1}`;
        } else {
          ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
          key = toDateKey(ref).slice(0, 7);
          label = ref.toLocaleDateString(undefined, { month: "short" });
        }
        const value = periodCount(goal.id, goal.cadence, ref);
        out.push({ label, value, met: value >= goal.target, key });
      }
      return out;
    },
    [periodCount, weekStartsOn],
  );

  return {
    active,
    archived,
    datesFor,
    addGoal,
    updateGoal,
    deleteGoal,
    moveGoal,
    toggleDay,
    tick,
    statsFor,
    periodHistory,
  };
}
