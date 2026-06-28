"use client";

import { Sheet } from "@/shared/ui/Sheet";
import { TrashIcon } from "@/shared/ui/icons";
import { formatLongDate } from "@/lib/utils/date";
import type { Task } from "@/types";

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task, patch: Partial<Task>) => void;
  onMoveDate: (task: Task, toDateKey: string) => void;
  onDelete: (task: Task) => void;
}

export function TaskDetailSheet({
  task,
  onClose,
  onUpdate,
  onMoveDate,
  onDelete,
}: TaskDetailSheetProps) {
  if (!task) return null;

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title="Task"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              onDelete(task);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-danger hover:bg-danger/10"
          >
            <TrashIcon size={15} /> Delete
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
          >
            Done
          </button>
        </div>
      }
    >
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Task
        </span>
        <textarea
          value={task.text}
          onChange={(e) => onUpdate(task, { text: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Notes
        </span>
        <textarea
          value={task.notes}
          onChange={(e) => onUpdate(task, { notes: e.target.value })}
          rows={5}
          placeholder="Add details, links, context…"
          className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Move to day
          </span>
          <span className="text-xs text-faint">{formatLongDate(task.date)}</span>
        </div>
        <input
          type="date"
          value={task.date}
          onChange={(e) => e.target.value && onMoveDate(task, e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={task.isLabel}
          onChange={(e) =>
            onUpdate(task, { isLabel: e.target.checked, completed: false })
          }
          className="size-4 accent-brand-600"
        />
        <span className="text-sm text-ink">Use as a heading</span>
      </label>
    </Sheet>
  );
}
