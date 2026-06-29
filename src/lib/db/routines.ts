import type { Routine, Task } from "@/types";
import { newId } from "@/lib/utils/id";
import { todayKey } from "@/lib/utils/date";

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
    if (r.active && r.days.includes(weekday) && r.lastGenerated !== today) {
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
