"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { newId } from "@/lib/utils/id";
import type { Task } from "@/types";

export interface DayTasks {
  incomplete: Task[];
  completed: Task[];
  all: Task[];
}

export function useTasks() {
  const { tasks, put, del } = useAppData();

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks]);

  const getDay = useCallback(
    (dateKey: string): DayTasks => {
      const all = byDate.get(dateKey) ?? [];
      return {
        all,
        incomplete: all.filter((t) => !t.completed),
        completed: all.filter((t) => t.completed),
      };
    },
    [byDate],
  );

  /** Persist a day's full order (incomplete then completed) with fresh positions. */
  const commitDay = useCallback(
    (dateKey: string, ordered: Task[]) => {
      put(
        "tasks",
        ordered.map((t, i) => ({ ...t, date: dateKey, position: i })),
      );
    },
    [put],
  );

  const addTask = useCallback(
    (dateKey: string, text: string, isLabel = false) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const { incomplete, completed } = getDay(dateKey);
      const task: Task = {
        id: newId(),
        date: dateKey,
        text: trimmed,
        completed: false,
        isLabel,
        notes: "",
        position: 0,
      };
      commitDay(dateKey, [...incomplete, task, ...completed]);
    },
    [getDay, commitDay],
  );

  const toggleTask = useCallback(
    (task: Task) => {
      const { incomplete, completed } = getDay(task.date);
      const nextDone = !task.completed;
      const updated = { ...task, completed: nextDone };
      const incompleteRest = incomplete.filter((t) => t.id !== task.id);
      const completedRest = completed.filter((t) => t.id !== task.id);
      const ordered = nextDone
        ? [...incompleteRest, ...completedRest, updated]
        : [...incompleteRest, updated, ...completedRest];
      commitDay(task.date, ordered);
    },
    [getDay, commitDay],
  );

  const updateTask = useCallback(
    (task: Task, patch: Partial<Task>) => {
      put("tasks", [{ ...task, ...patch }]);
    },
    [put],
  );

  const toggleLabel = useCallback(
    (task: Task) => {
      put("tasks", [
        { ...task, isLabel: !task.isLabel, completed: false },
      ]);
    },
    [put],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      del("tasks", [id]);
      return () => {
        if (task) put("tasks", [task]);
      };
    },
    [tasks, del, put],
  );

  const reorderIncomplete = useCallback(
    (dateKey: string, orderedIncomplete: Task[]) => {
      const { completed } = getDay(dateKey);
      commitDay(dateKey, [...orderedIncomplete, ...completed]);
    },
    [getDay, commitDay],
  );

  /** Move a task to another day, inserting before `beforeId` (or at the end). */
  const moveTask = useCallback(
    (taskId: string, toDateKey: string, beforeId: string | null) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.date === toDateKey) return;
      const fromDay = getDay(task.date);
      const toDay = getDay(toDateKey);
      const moved = { ...task, date: toDateKey };

      const sourceIncomplete = fromDay.incomplete.filter((t) => t.id !== taskId);
      commitDay(task.date, [...sourceIncomplete, ...fromDay.completed]);

      const targetIncomplete = [...toDay.incomplete];
      const index = beforeId
        ? targetIncomplete.findIndex((t) => t.id === beforeId)
        : -1;
      if (index >= 0) targetIncomplete.splice(index, 0, moved);
      else targetIncomplete.push(moved);
      commitDay(toDateKey, [...targetIncomplete, ...toDay.completed]);
    },
    [tasks, getDay, commitDay],
  );

  return {
    getDay,
    addTask,
    toggleTask,
    updateTask,
    toggleLabel,
    deleteTask,
    reorderIncomplete,
    moveTask,
  };
}
