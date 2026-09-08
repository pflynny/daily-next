import type { Routine, Task } from "@/types";
import { newId } from "@/lib/utils/id";
import { todayKey } from "@/lib/utils/date";

/** Convert an existing task without creating another occurrence on its date. */
export function routineFromTask(task: Task, days: number[], routines: Routine[]): Routine | null {
  const schedule = [...new Set(days)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort();
  if (task.isLabel || !task.text.trim() || !schedule.length) return null;
  const existing = routines.find((routine) => routine.id === task.id);
  return {
    // Task and routine UUIDs live in separate tables. Re-saving this source
    // updates its routine rather than creating a second schedule.
    id: task.id,
    text: task.text.trim(),
    days: schedule,
    active: true,
    position: existing?.position ?? routines.length,
    lastGenerated: [todayKey(), task.date, existing?.lastGenerated ?? ""].sort().at(-1)!,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Generate today's tasks from active routines whose schedule includes today's
 * weekday and that haven't been generated yet today. Returns the merged lists
 * plus the rows that changed (for persistence).
 */
export function generateRoutineTasks(
  routines: Routine[],
  tasks: Task[],
): {
  tasks: Task[];
  routines: Routine[];
  changedTasks: Task[];
  changedRoutines: Routine[];
} {
  const today = todayKey();
  const weekday = new Date().getDay();

  let basePos =
    tasks
      .filter((t) => t.date === today)
      .reduce((max, t) => Math.max(max, t.position), -1) + 1;

  const newTasks: Task[] = [];
  const changedRoutines: Routine[] = [];

  const updatedRoutines = routines.map((r) => {
    if (r.active && r.days.includes(weekday) && (!r.lastGenerated || r.lastGenerated < today)) {
      newTasks.push({
        id: newId(),
        date: today,
        text: r.text,
        completed: false,
        isLabel: false,
        notes: "",
        position: basePos++,
      });
      const next = { ...r, lastGenerated: today };
      changedRoutines.push(next);
      return next;
    }
    return r;
  });

  return {
    tasks: newTasks.length ? [...tasks, ...newTasks] : tasks,
    routines: changedRoutines.length ? updatedRoutines : routines,
    changedTasks: newTasks,
    changedRoutines,
  };
}
