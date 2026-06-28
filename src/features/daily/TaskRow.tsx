"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, GripIcon, NoteIcon, XIcon } from "@/shared/ui/icons";
import type { Task } from "@/types";

interface TaskRowProps {
  task: Task;
  sortable: boolean;
  onToggle: (task: Task) => void;
  onUpdateText: (task: Task, text: string) => void;
  onOpenDetail: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskRow({
  task,
  sortable,
  onToggle,
  onUpdateText,
  onOpenDetail,
  onDelete,
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

  const style = { transform: CSS.Transform.toString(transform), transition };

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) onUpdateText(task, trimmed);
    else setDraft(task.text);
  }

  const actions = (
    <div className="absolute right-0.5 top-1 flex items-center gap-0.5">
      <button
        onClick={() => onOpenDetail(task)}
        aria-label="Task details"
        className={cn(
          "rounded p-1 transition-colors hover:text-ink",
          task.notes ? "text-brand-600" : "hover-reveal text-faint",
        )}
      >
        <NoteIcon size={15} />
      </button>
      {sortable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag task"
          className="hover-reveal cursor-grab touch-none rounded p-1 text-faint hover:text-ink active:cursor-grabbing"
        >
          <GripIcon size={15} />
        </button>
      )}
      <button
        onClick={() => onDelete(task)}
        aria-label="Delete task"
        className="hover-reveal rounded p-1 text-faint hover:text-danger"
      >
        <XIcon size={15} />
      </button>
    </div>
  );

  if (task.isLabel) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative py-2 pl-4 pr-16",
          isDragging && "opacity-50",
        )}
      >
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
            className="w-full bg-transparent text-xs font-bold uppercase tracking-wide text-brand-700 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(task.text);
              setEditing(true);
            }}
            className="block w-full text-left text-xs font-bold uppercase tracking-wide text-brand-700"
          >
            {task.text}
          </button>
        )}
        {actions}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative py-1.5 pl-9 pr-16",
        isDragging && "opacity-50",
      )}
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "absolute left-3 top-1.5 flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
          task.completed
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-line text-transparent hover:border-brand-400 hover-reveal",
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
          className="w-full bg-transparent text-sm leading-snug outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(task.text);
            setEditing(true);
          }}
          className={cn(
            "block w-full break-words text-left text-sm leading-snug [overflow-wrap:anywhere]",
            task.completed ? "text-faint line-through" : "text-ink",
          )}
        >
          {task.text}
        </button>
      )}

      {actions}
    </div>
  );
}
