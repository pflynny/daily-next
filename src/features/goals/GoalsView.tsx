"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { PlusIcon, TargetIcon } from "@/shared/ui/icons";
import { YearPicker } from "@/shared/ui/YearPicker";
import { useToast } from "@/shared/ui/ToastProvider";
import { useGoals } from "./useGoals";
import { GoalCard } from "./GoalCard";
import { GoalFormSheet } from "./GoalFormSheet";
import type { Goal } from "@/types";

export function GoalsView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const goals = useGoals(year);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  function openAdd() {
    setEditGoal(null);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="GOALS">
        {/* Goals are set per calendar year; December planning for next year is allowed */}
        <YearPicker year={year} onChange={setYear} max={currentYear + 1} />
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
            <h2 className="mt-4 text-sm font-semibold text-ink">
              No goals for {year} yet
            </h2>
            <p className="mt-1 text-sm text-muted">
              Goals are set fresh each year. Track a daily habit with a year
              grid, or set a weekly target like “3 workouts a week”.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
              >
                <PlusIcon size={15} /> Add a goal
              </button>
              {goals.previousYearGoals.length > 0 && (
                <button
                  onClick={goals.carryOverGoals}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
                >
                  Carry over from {year - 1} (
                  {goals.previousYearGoals.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4 p-4">
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
