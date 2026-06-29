"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils/cn";
import { dayLabelFromKey, todayKey } from "@/lib/utils/date";
import { TaskRow } from "./TaskRow";
import type { Task } from "@/types";

interface DayColumnProps {
  dateKey: string;
  incomplete: Task[];
  completed: Task[];
  onAdd: (dateKey: string, text: string) => void;
  onToggle: (task: Task) => void;
  onUpdateText: (task: Task, text: string) => void;
  onOpenDetail: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function DayColumn({
  dateKey,
  incomplete,
  completed,
  onAdd,
  onToggle,
  onUpdateText,
  onOpenDetail,
  onDelete,
}: DayColumnProps) {
  const isToday = dateKey === todayKey();
  const label = dayLabelFromKey(dateKey);
  const [draft, setDraft] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: `col:${dateKey}`,
    data: { type: "column", date: dateKey },
  });

  function submit() {
    if (draft.trim()) {
      onAdd(dateKey, draft);
      setDraft("");
    }
  }

  return (
    <div
      data-day
      className={cn(
        "flex min-h-0 flex-col border-line md:border-r",
        isToday ? "bg-today" : "bg-paper",
      )}
    >
      <div className="pl-6 pr-4 pt-5 pb-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-brand-500/80">
          {label.day} {label.month}, {label.year}
        </div>
        <div
          className={cn(
            "text-xl font-bold uppercase leading-none",
            isToday ? "text-brand-600" : "text-brand-800/80",
          )}
        >
          {label.dayName}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "thin-scrollbar flex-1 overflow-y-auto pb-4 transition-colors",
          isOver && "bg-brand-50",
        )}
      >
        <SortableContext
          items={incomplete.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {incomplete.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              sortable
              onToggle={onToggle}
              onUpdateText={onUpdateText}
              onOpenDetail={onOpenDetail}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        <div className="pl-6 pr-4 py-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            onBlur={submit}
            placeholder="Add task…"
            aria-label={`Add task for ${label.dayName}`}
            className="w-full bg-transparent text-sm text-ink placeholder:text-faint/70 outline-none"
          />
        </div>

        {completed.length > 0 && (
          <div className="mt-1">
            {completed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                sortable={false}
                onToggle={onToggle}
                onUpdateText={onUpdateText}
                onOpenDetail={onOpenDetail}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
