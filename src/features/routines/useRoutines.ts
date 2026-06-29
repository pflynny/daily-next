"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { newId } from "@/lib/utils/id";
import { todayKey } from "@/lib/utils/date";
import type { Routine } from "@/types";

export function useRoutines() {
  const { routines, tasks, put, del } = useAppData();

  const ordered = useMemo(
    () => [...routines].sort((a, b) => a.position - b.position),
    [routines],
  );

  const addRoutine = useCallback(
    (text: string, days: number[]) => {
      const trimmed = text.trim();
      if (!trimmed || days.length === 0) return;
      const today = todayKey();
      const weekday = new Date().getDay();
      const runsToday = days.includes(weekday);

      put("routines", [
        {
          id: newId(),
          text: trimmed,
          days,
          active: true,
          position: routines.length,
          lastGenerated: runsToday ? today : null,
          createdAt: new Date().toISOString(),
        },
      ]);

      // Show it on today immediately if it runs today.
      if (runsToday) {
        const basePos =
          tasks
            .filter((t) => t.date === today)
            .reduce((max, t) => Math.max(max, t.position), -1) + 1;
        put("tasks", [
          {
            id: newId(),
            date: today,
            text: trimmed,
            completed: false,
            isLabel: false,
            notes: "",
            position: basePos,
          },
        ]);
      }
    },
    [routines.length, tasks, put],
  );

  const updateRoutine = useCallback(
    (routine: Routine, patch: Partial<Routine>) =>
      put("routines", [{ ...routine, ...patch }]),
    [put],
  );

  const deleteRoutine = useCallback(
    (id: string) => {
      const routine = routines.find((r) => r.id === id);
      del("routines", [id]);
      return () => {
        if (routine) put("routines", [routine]);
      };
    },
    [routines, del, put],
  );

  return { routines: ordered, addRoutine, updateRoutine, deleteRoutine };
}
