"use client";

import { useId, useState } from "react";
import { Sheet } from "@/shared/ui/Sheet";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useRoutines } from "./useRoutines";
import type { Task } from "@/types";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const everyDay = [0, 1, 2, 3, 4, 5, 6];

export function RepeatTaskSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const { routines, repeatTask, updateRoutine } = useRoutines();
  const existing = routines.find((routine) => routine.id === task.id);
  const [days, setDays] = useState(existing?.days ?? everyDay);
  const [frequency, setFrequency] = useState(existing ? "custom" : "daily");
  const frequencyId = useId();
  const weekday = new Date(`${task.date}T12:00:00`).getDay();

  return (
    <Sheet open onClose={onClose} title="Repeat task" footer={
      <div className="flex flex-wrap justify-end gap-2">
        {existing?.active && <Button variant="danger" onClick={() => {
          updateRoutine(existing, { active: false });
          onClose();
        }}>Stop repeating</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!days.length} onClick={() => {
          repeatTask(task, days);
          onClose();
        }}>{existing ? "Save repeat" : "Start repeating"}</Button>
      </div>
    }>
      <p className="mb-5 break-words text-sm font-semibold text-ink">{task.text}</p>
      <label htmlFor={frequencyId} className="mb-2 block text-xs font-semibold text-muted">Repeat</label>
      <select id={frequencyId} data-initial-focus value={frequency} onChange={(event) => {
        const value = event.target.value;
        setFrequency(value);
        if (value === "daily") setDays(everyDay);
        if (value === "weekdays") setDays([1, 2, 3, 4, 5]);
        if (value === "weekly") setDays([weekday]);
      }} className="min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink">
        <option value="daily">Every day</option>
        <option value="weekdays">Weekdays</option>
        <option value="weekly">Weekly on {dayNames[weekday]}</option>
        <option value="custom">Choose days</option>
      </select>
      {frequency === "custom" && <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-semibold text-muted">Repeat on</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => <button key={day} type="button"
            aria-label={dayNames[day]} aria-pressed={days.includes(day)}
            onClick={() => setDays((current) => current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort())}
            className={cn("min-h-11 min-w-11 rounded-lg border px-2 text-xs font-semibold", days.includes(day)
              ? "border-brand-700 bg-brand-700 text-white" : "border-line text-muted hover:bg-sand")}>
            {dayNames[day].slice(0, 3)}
          </button>)}
        </div>
        {!days.length && <p role="status" className="mt-2 text-xs text-danger">Choose at least one day.</p>}
      </fieldset>}
      <p className="mt-5 text-xs leading-relaxed text-muted">
        A new task will appear when you open Daily on a matching day, starting after this task’s date and today.
        Manage or pause repeats in Settings → Routines. Changes to individual tasks won’t change the routine.
      </p>
      {task.notes && <p className="mt-2 text-xs text-muted">Notes stay with this task; future repeats start with empty notes.</p>}
    </Sheet>
  );
}
