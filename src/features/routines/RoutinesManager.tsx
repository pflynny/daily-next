"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { PlusIcon, TrashIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/ToastProvider";
import { useRoutines } from "./useRoutines";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERYDAY = [0, 1, 2, 3, 4, 5, 6];

function DayChips({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="flex gap-1">
      {DAYS.map((label, i) => {
        const on = value.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() =>
              onChange(
                on ? value.filter((d) => d !== i) : [...value, i].sort(),
              )
            }
            aria-pressed={on}
            className={cn(
              "size-7 rounded-full text-xs font-semibold transition-colors",
              on
                ? "bg-brand-600 text-white"
                : "bg-sand text-faint hover:text-ink",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function RoutinesManager() {
  const { routines, addRoutine, updateRoutine, deleteRoutine } = useRoutines();
  const toast = useToast();
  const [text, setText] = useState("");
  const [days, setDays] = useState<number[]>(WEEKDAYS);

  function add() {
    if (!text.trim() || days.length === 0) return;
    addRoutine(text, days);
    setText("");
    setDays(WEEKDAYS);
  }

  return (
    <div>
      {routines.length > 0 && (
        <ul className="mb-4 space-y-3">
          {routines.map((r) => (
            <li key={r.id} className="border-b border-line/60 pb-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm",
                    r.active ? "text-ink" : "text-faint line-through",
                  )}
                >
                  {r.text}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => updateRoutine(r, { active: !r.active })}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink"
                  >
                    {r.active ? "On" : "Off"}
                  </button>
                  <button
                    onClick={() => {
                      const restore = deleteRoutine(r.id);
                      toast.undo("Routine deleted", restore);
                    }}
                    aria-label="Delete routine"
                    className="rounded-md p-1 text-faint hover:text-danger"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
              <DayChips
                value={r.days}
                onChange={(d) => updateRoutine(r, { days: d })}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl bg-paper p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New routine, e.g. Make the bed"
          className="mb-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DayChips value={days} onChange={setDays} />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDays(WEEKDAYS)}
              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink"
            >
              Weekdays
            </button>
            <button
              onClick={() => setDays(EVERYDAY)}
              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink"
            >
              Every day
            </button>
            <button
              onClick={add}
              disabled={!text.trim() || days.length === 0}
              className="flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800 disabled:opacity-50"
            >
              <PlusIcon size={13} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
