"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ChevronUp,
  ChevronDown,
  PencilIcon,
  PlusIcon,
} from "@/shared/ui/icons";
import { DailyHeatmap } from "./DailyHeatmap";
import type { GoalStats } from "./useGoals";
import type { Goal } from "@/types";

interface GoalCardProps {
  goal: Goal;
  year: number;
  stats: GoalStats;
  counts: Map<string, number>;
  history: {
    label: string;
    value: number;
    met: boolean;
    key: string;
    future: boolean;
    month: number;
  }[];
  isFirst: boolean;
  isLast: boolean;
  onRename: (goal: Goal, title: string) => void;
  onToggleDay: (goalId: string, dateKey: string) => void;
  onTick: (goalId: string, delta: 1 | -1) => void;
  onMove: (goalId: string, dir: -1 | 1) => void;
  onEdit: (goal: Goal) => void;
}

function cadenceLabel(goal: Goal): string {
  if (goal.cadence === "day") return "Daily habit";
  return `${goal.target}× / ${goal.cadence === "week" ? "week" : "month"}`;
}

export function GoalCard({
  goal,
  year,
  stats,
  counts,
  history,
  isFirst,
  isLast,
  onRename,
  onToggleDay,
  onTick,
  onMove,
  onEdit,
}: GoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.title);
  const isDaily = goal.cadence === "day";
  const pct = Math.min(100, Math.round((stats.current / goal.target) * 100));

  // Streaks in met periods (weeks/months), ignoring periods that haven't
  // started yet. The current period doesn't break the streak while it's
  // still in progress and unmet.
  const periodStreaks = useMemo(() => {
    const past = history.filter((h) => !h.future);
    let best = 0;
    let run = 0;
    for (const h of past) {
      run = h.met ? run + 1 : 0;
      best = Math.max(best, run);
    }
    let i = past.length - 1;
    if (i >= 0 && !past[i].met) i -= 1;
    let current = 0;
    for (; i >= 0 && past[i].met; i -= 1) current += 1;
    return { current, best };
  }, [history]);

  // First period of each month → month initial positioned over the strip.
  const monthMarks = useMemo(() => {
    const marks: { idx: number; letter: string }[] = [];
    let last = -1;
    history.forEach((h, idx) => {
      if (h.month !== last) {
        marks.push({ idx, letter: "JFMAMJJASOND"[h.month] });
        last = h.month;
      }
    });
    // drop a leading December week carried in from the previous year
    return marks.filter((m, i) => !(i === 0 && m.letter === "D"));
  }, [history]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setEditing(false);
                onRename(goal, draft);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditing(false);
                  onRename(goal, draft);
                }
              }}
              className="w-full bg-transparent text-sm font-semibold text-ink outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setDraft(goal.title);
                setEditing(true);
              }}
              className="block truncate text-left text-sm font-semibold text-ink"
            >
              {goal.title}
            </button>
          )}
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-brand-500">
            {cadenceLabel(goal)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 text-faint">
          <button
            onClick={() => onMove(goal.id, -1)}
            disabled={isFirst}
            aria-label="Move up"
            className="rounded p-1 hover:text-ink disabled:opacity-30"
          >
            <ChevronUp size={15} />
          </button>
          <button
            onClick={() => onMove(goal.id, 1)}
            disabled={isLast}
            aria-label="Move down"
            className="rounded p-1 hover:text-ink disabled:opacity-30"
          >
            <ChevronDown size={15} />
          </button>
          <button
            onClick={() => onEdit(goal)}
            aria-label="Edit goal"
            className="rounded p-1 hover:text-ink"
          >
            <PencilIcon size={15} />
          </button>
        </div>
      </div>

      {isDaily ? (
        <>
          <DailyHeatmap
            year={year}
            counts={counts}
            onToggleDay={(dk) => onToggleDay(goal.id, dk)}
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line/70 pt-2.5 text-[11px] text-muted">
            <Stat label="Streak" value={`${stats.currentStreak}`} />
            <Stat label="Best" value={`${stats.bestStreak}`} />
            <Stat label="Days" value={`${stats.total}`} />
            <Stat label="Score" value={`${stats.score}/10`} />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onTick(goal.id, -1)}
              disabled={stats.current <= 0}
              aria-label="Remove one"
              className="flex size-9 items-center justify-center rounded-full border border-line text-muted hover:text-ink disabled:opacity-30"
            >
              <span className="text-lg leading-none">−</span>
            </button>
            <div className="flex-1 text-center">
              <div className="font-mono text-2xl font-bold leading-none text-ink">
                {stats.current}
                <span className="text-muted">/{goal.target}</span>
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {goal.cadence === "week" ? "this week" : "this month"}
              </div>
            </div>
            <button
              onClick={() => onTick(goal.id, 1)}
              aria-label="Add one"
              className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
            >
              <PlusIcon size={18} />
            </button>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                stats.current >= goal.target ? "bg-brand-600" : "bg-brand-400",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Month letters, aligned over the first period of each month */}
          <div className="relative mt-4 h-3.5 text-[10px] font-medium uppercase text-faint">
            {monthMarks.map((m) => (
              <span
                key={m.idx}
                className="absolute"
                style={{ left: `${(m.idx / history.length) * 100}%` }}
              >
                {m.letter}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-end gap-[3px]">
            {history.map((h) => (
              <div key={h.key} className="group/period relative flex-1">
                <div
                  className={cn(
                    "h-7 rounded-[3px]",
                    h.future
                      ? "bg-sand/45"
                      : h.met
                        ? "bg-brand-600"
                        : h.value > 0
                          ? "bg-brand-300"
                          : "bg-sand",
                  )}
                />
                {!h.future && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-sm group-hover/period:block">
                    {goal.cadence === "week" ? `w/c ${h.label}` : h.label} ·{" "}
                    {h.value}/{goal.target}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line/70 pt-2.5 text-[11px] text-muted">
            <Stat
              label="Streak"
              value={`${periodStreaks.current} ${goal.cadence === "week" ? "wk" : "mo"}${periodStreaks.current === 1 ? "" : "s"}`}
            />
            <Stat label="Best" value={`${periodStreaks.best}`} />
            <Stat label="This year" value={`${stats.total}`} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="uppercase tracking-wide text-faint">{label} </span>
      <span className="font-semibold text-ink">{value}</span>
    </span>
  );
}
