"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, GripIcon, MoreIcon, NoteIcon, TrashIcon } from "@/shared/ui/icons";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "@/shared/ui/DropdownMenu";
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

  // Grip + ⋯ on every device: clean rows, delete behind a second tap.
  // Desktop reveals them on hover; touch keeps them visible. A task with
  // notes keeps its ⋯ visible with a green dot as the "has notes" hint.
  const actions = (
    <div className="absolute right-0.5 top-1 flex items-center gap-0.5">
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
      <DropdownMenu
        trigger={
          <button
            aria-label="Task options"
            className={cn(
              "relative rounded p-1 text-faint hover:text-ink",
              !task.notes && "hover-reveal",
            )}
          >
            <MoreIcon size={15} />
            {task.notes && (
              <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-brand-500" />
            )}
          </button>
        }
      >
        <DropdownItem onClick={() => onOpenDetail(task)}>
          <NoteIcon size={13} /> {task.notes ? "Edit notes" : "Add notes"}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onClick={() => onDelete(task)}>
          <TrashIcon size={13} /> Delete
        </DropdownItem>
      </DropdownMenu>
    </div>
  );

  if (task.isLabel) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "touch-actions-pad group relative py-2 pl-7",
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
        "touch-actions-pad group relative py-1.5 pl-7",
        isDragging && "opacity-50",
      )}
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "absolute left-1.5 top-[0.45rem] flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
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
            "block w-full text-left text-sm leading-snug",
            "truncate group-hover:whitespace-normal group-hover:overflow-visible",
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
