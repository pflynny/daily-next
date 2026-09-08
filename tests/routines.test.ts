import test from "node:test";
import assert from "node:assert/strict";
import { generateRoutineTasks, routineFromTask } from "../src/lib/db/routines";
import { addDays, toDateKey, todayKey } from "../src/lib/utils/date";
import type { Task } from "../src/types";

const task: Task = { id: "source", date: todayKey(), text: "Read", completed: false, isLabel: false, notes: "", position: 0 };
const daily = [0, 1, 2, 3, 4, 5, 6];

test("repeating a task keeps the existing occurrence without adding one today", () => {
  const routine = routineFromTask(task, daily, [])!;
  assert.equal(generateRoutineTasks([routine], [task]).changedTasks.length, 0);
  const future = routineFromTask({ ...task, date: toDateKey(addDays(new Date(), 7)) }, daily, [])!;
  assert.equal(generateRoutineTasks([future], []).changedTasks.length, 0);
});

test("re-saving a repeat updates its identity and validates the schedule", () => {
  const routine = routineFromTask(task, daily, [])!;
  const edited = routineFromTask(task, [2, 2, 4, 9], [routine])!;
  assert.equal(edited.id, routine.id);
  assert.equal(edited.createdAt, routine.createdAt);
  assert.deepEqual(edited.days, [2, 4]);
  assert.equal(routineFromTask(task, [], []), null);
  assert.equal(routineFromTask({ ...task, isLabel: true }, daily, []), null);
});

test("scheduled repeats generate once per day and respect paused or excluded days", () => {
  const routine = { ...routineFromTask(task, daily, [])!, lastGenerated: toDateKey(addDays(new Date(), -1)) };
  const result = generateRoutineTasks([routine], []);
  assert.equal(result.changedTasks.length, 1);
  assert.equal(result.changedTasks[0].text, task.text);
  assert.equal(generateRoutineTasks(result.routines, result.tasks).changedTasks.length, 0);
  assert.equal(generateRoutineTasks([{ ...routine, active: false }], []).changedTasks.length, 0);
  assert.equal(generateRoutineTasks([{ ...routine, days: [(new Date().getDay() + 1) % 7] }], []).changedTasks.length, 0);
});
