"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, GripIcon, NoteIcon } from "@/shared/ui/icons";
import type { Task } from "@/types";

interface TaskRowProps {
  task: Task;
  sortable: boolean;
  onToggle: (task: Task) => void;
  onUpdateText: (task: Task, text: string) => void;
  onOpenDetail: (task: Task) => void;
}

export function TaskRow({
  task,
  sortable,
  onToggle,
  onUpdateText,
  onOpenDetail,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", date: task.date },
    disabled: !sortable || editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) onUpdateText(task, trimmed);
    else setDraft(task.text);
  }

  if (task.isLabel) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-1.5 px-4 py-2",
          isDragging && "opacity-50",
        )}
      >
        {sortable && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag heading"
            className="touch-none text-line opacity-0 transition-opacity hover:text-faint group-hover:opacity-100"
          >
            <GripIcon size={16} />
          </button>
        )}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(task.text);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wide text-brand-700 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(task.text);
              setEditing(true);
            }}
            className="flex-1 text-left text-xs font-bold uppercase tracking-wide text-brand-700"
          >
            {task.text}
          </button>
        )}
        <button
          onClick={() => onOpenDetail(task)}
          aria-label="Task options"
          className="text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
        >
          <NoteIcon size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-1.5 px-4 py-1.5",
        isDragging && "opacity-50",
      )}
    >
      {sortable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag task"
          className="mt-0.5 shrink-0 touch-none text-line opacity-0 transition-opacity hover:text-faint group-hover:opacity-100"
        >
          <GripIcon size={16} />
        </button>
      )}

      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          task.completed
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-line text-transparent hover:border-brand-400",
        )}
      >
        <CheckIcon size={12} />
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(task.text);
              setEditing(false);
            }
          }}
          className="flex-1 bg-transparent text-sm leading-snug outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(task.text);
            setEditing(true);
          }}
          className={cn(
            "flex-1 break-words text-left text-sm leading-snug [overflow-wrap:anywhere]",
            task.completed ? "text-faint line-through" : "text-ink",
          )}
        >
          {task.text}
        </button>
      )}

      <button
        onClick={() => onOpenDetail(task)}
        aria-label="Task options"
        className={cn(
          "mt-0.5 shrink-0 transition-opacity hover:text-ink",
          task.notes
            ? "text-brand-600 opacity-100"
            : "text-faint opacity-0 group-hover:opacity-100",
        )}
      >
        <NoteIcon size={15} />
      </button>
    </div>
  );
}
