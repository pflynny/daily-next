"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { ChevronLeft, ChevronRight, PlusIcon, TargetIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/ToastProvider";
import { useGoals } from "./useGoals";
import { GoalCard } from "./GoalCard";
import { GoalFormSheet } from "./GoalFormSheet";
import type { Goal } from "@/types";

export function GoalsView() {
  const goals = useGoals();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [formOpen, setFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  function openAdd() {
    setEditGoal(null);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="GOALS">
        <div className="flex items-center gap-1 rounded-lg border border-line px-1">
            <button
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              className="rounded p-1 text-muted hover:text-ink"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-[3ch] text-center text-xs font-semibold text-ink">
              {year}
            </span>
            <button
              onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              disabled={year >= currentYear}
              aria-label="Next year"
              className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </button>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
        >
          <PlusIcon size={15} /> Goal
        </button>
      </PageHeader>

      <Screen>
        {goals.active.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
            <TargetIcon size={40} className="text-brand-300" />
            <h2 className="mt-4 text-sm font-semibold text-ink">No goals yet</h2>
            <p className="mt-1 text-sm text-muted">
              Track a daily habit with a year grid, or set a weekly target like
              “3 workouts a week” and tick it off as you go.
            </p>
            <button
              onClick={openAdd}
              className="mt-5 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
            >
              <PlusIcon size={15} /> Add your first goal
            </button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-2xl gap-4 p-4">
            {goals.active.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                year={year}
                stats={goals.statsFor(goal, year)}
                counts={goals.datesFor(goal.id)}
                history={goals.periodHistory(goal, year)}
                isFirst={i === 0}
                isLast={i === goals.active.length - 1}
                onRename={(g, title) => goals.updateGoal(g, { title })}
                onToggleDay={goals.toggleDay}
                onTick={goals.tick}
                onMove={goals.moveGoal}
                onEdit={(g) => {
                  setEditGoal(g);
                  setFormOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </Screen>

      <GoalFormSheet
        open={formOpen}
        goal={editGoal}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => {
          if (editGoal) goals.updateGoal(editGoal, input);
          else goals.addGoal(input);
        }}
        onDelete={(g) => {
          const restore = goals.deleteGoal(g.id);
          toast.undo("Goal deleted", restore);
        }}
      />
    </div>
  );
}
