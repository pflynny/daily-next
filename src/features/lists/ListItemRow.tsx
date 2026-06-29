"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, MoreIcon, NoteIcon, TrashIcon } from "@/shared/ui/icons";
import type { ListItem } from "@/types";

interface ListItemRowProps {
  item: ListItem;
  sortable: boolean;
  onToggle: (item: ListItem) => void;
  onUpdateText: (item: ListItem, text: string) => void;
  onOpenDetail: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}

export function ListItemRow({
  item,
  sortable,
  onToggle,
  onUpdateText,
  onOpenDetail,
  onDelete,
}: ListItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(sortable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "group relative border-b border-line/70 py-2 pl-5 pr-7",
        sortable && "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-50",
      )}
    >
      {/* Checkbox in left gutter */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(item); }}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "absolute left-0.5 top-2.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          item.completed
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-line text-transparent hover:border-brand-400 hover-reveal",
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
          className="w-full bg-transparent text-xs leading-snug outline-none"
        />
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setDraft(item.text); setEditing(true); }}
          className={cn(
            "block w-full text-left text-xs leading-snug truncate group-hover:whitespace-normal group-hover:overflow-visible",
            item.completed ? "text-faint line-through" : "text-ink",
          )}
        >
          {item.text}
        </button>
      )}

      {/* ⋮ menu */}
      <div ref={menuRef} className="absolute right-0.5 top-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          aria-label="Item options"
          className="hover-reveal rounded p-0.5 text-faint hover:text-ink"
        >
          <MoreIcon size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-50 min-w-[130px] rounded-lg border border-line bg-surface py-1 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(item); setMenuOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink hover:bg-sand",
              )}
            >
              <NoteIcon size={13} />
              {item.notes ? "Edit details" : "Add details"}
            </button>
            <div className="my-1 border-t border-line" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-danger hover:bg-sand"
            >
              <TrashIcon size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
