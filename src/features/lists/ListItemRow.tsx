"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, GripIcon, NoteIcon } from "@/shared/ui/icons";
import type { ListItem } from "@/types";

interface ListItemRowProps {
  item: ListItem;
  sortable: boolean;
  onToggle: (item: ListItem) => void;
  onUpdateText: (item: ListItem, text: string) => void;
  onOpenDetail: (item: ListItem) => void;
}

export function ListItemRow({
  item,
  sortable,
  onToggle,
  onUpdateText,
  onOpenDetail,
}: ListItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: "listItem", listId: item.listId },
    disabled: !sortable || editing,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) onUpdateText(item, trimmed);
    else setDraft(item.text);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-1.5 border-b border-line/70 px-1 py-2",
        isDragging && "opacity-50",
      )}
    >
      {sortable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag item"
          className="mt-0.5 shrink-0 touch-none text-line opacity-0 transition-opacity hover:text-faint group-hover:opacity-100"
        >
          <GripIcon size={15} />
        </button>
      )}
      <button
        onClick={() => onToggle(item)}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          item.completed
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-line text-transparent hover:border-brand-400",
        )}
      >
        <CheckIcon size={11} />
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
              setDraft(item.text);
              setEditing(false);
            }
          }}
          className="flex-1 bg-transparent text-xs leading-snug outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(item.text);
            setEditing(true);
          }}
          className={cn(
            "flex-1 break-words text-left text-xs leading-snug [overflow-wrap:anywhere]",
            item.completed ? "text-faint line-through" : "text-ink",
          )}
        >
          {item.text}
        </button>
      )}

      <button
        onClick={() => onOpenDetail(item)}
        aria-label="Item options"
        className={cn(
          "mt-0.5 shrink-0 transition-opacity hover:text-ink",
          item.notes
            ? "text-brand-600 opacity-100"
            : "text-faint opacity-0 group-hover:opacity-100",
        )}
      >
        <NoteIcon size={14} />
      </button>
    </div>
  );
}
