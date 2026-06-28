import type { Task } from "@/types";
import { todayKey } from "@/lib/utils/date";

/**
 * Pull incomplete, non-label tasks from past days onto today, placing them
 * above today's existing tasks. Returns the new task list plus the subset of
 * tasks whose date/position changed (so callers can persist just those).
 */
export function carryOverTasks(tasks: Task[]): {
  tasks: Task[];
  changed: Task[];
} {
  const today = todayKey();
  const overdue = tasks.filter(
    (t) => !t.completed && !t.isLabel && t.date < today,
  );
  if (overdue.length === 0) return { tasks, changed: [] };

  const overdueIds = new Set(overdue.map((t) => t.id));
  const changed: Task[] = [];

  const carried = [...overdue]
    .sort((a, b) =>
      a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1,
    )
    .map((t, i) => {
      const next = { ...t, date: today, position: i };
      changed.push(next);
      return next;
    });

  const existingToday = tasks.filter(
    (t) => t.date === today && !overdueIds.has(t.id),
  );
  const bumped = new Map<string, Task>();
  existingToday.forEach((t) => {
    const next = { ...t, position: t.position + carried.length };
    bumped.set(t.id, next);
    changed.push(next);
  });

  const result = tasks.map((t) => {
    if (overdueIds.has(t.id)) return carried.find((c) => c.id === t.id)!;
    if (bumped.has(t.id)) return bumped.get(t.id)!;
    return t;
  });

  return { tasks: result, changed };
}
