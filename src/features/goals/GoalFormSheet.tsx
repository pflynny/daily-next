"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/shared/ui/Sheet";
import { cn } from "@/lib/utils/cn";
import { TrashIcon } from "@/shared/ui/icons";
import type { Goal, GoalCadence } from "@/types";

interface GoalFormSheetProps {
  open: boolean;
  /** When set, the form edits this goal; otherwise it creates a new one. */
  goal: Goal | null;
  onClose: () => void;
  onSubmit: (input: { title: string; cadence: GoalCadence; target: number }) => void;
  onDelete?: (goal: Goal) => void;
}

const CADENCES: { value: GoalCadence; label: string; hint: string }[] = [
  { value: "day", label: "Daily", hint: "Tick it every day — shows a year grid" },
  { value: "week", label: "Weekly", hint: "A number of times each week" },
  { value: "month", label: "Monthly", hint: "A number of times each month" },
];

export function GoalFormSheet({
  open,
  goal,
  onClose,
  onSubmit,
  onDelete,
}: GoalFormSheetProps) {
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<GoalCadence>("day");
  const [target, setTarget] = useState(3);

  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setCadence(goal?.cadence ?? "day");
      setTarget(goal && goal.cadence !== "day" ? goal.target : 3);
    }
  }, [open, goal]);

  function submit() {
    if (!title.trim()) return;
    onSubmit({
      title,
      cadence,
      target: cadence === "day" ? 1 : Math.max(1, target),
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Edit goal" : "New goal"}
      footer={
        <div className="flex items-center justify-between">
          {goal && onDelete ? (
            <button
              onClick={() => {
                onDelete(goal);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-danger hover:bg-danger/10"
            >
              <TrashIcon size={15} /> Delete
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {goal ? "Save" : "Add goal"}
          </button>
        </div>
      }
    >
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Goal
        </span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Work out, Read, Meditate"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          How often
        </span>
        <div className="grid grid-cols-3 gap-2">
          {CADENCES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCadence(c.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                cadence === c.value
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-line text-muted hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-faint">
          {CADENCES.find((c) => c.value === cadence)?.hint}
        </p>
      </div>

      {cadence !== "day" && (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Target per {cadence === "week" ? "week" : "month"}
          </span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={99}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value) || 1)}
              className="w-24 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
            <span className="text-sm text-muted">
              times / {cadence === "week" ? "week" : "month"}
            </span>
          </div>
        </label>
      )}
    </Sheet>
  );
}
