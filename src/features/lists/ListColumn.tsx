"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, ChevronRight, TrashIcon } from "@/shared/ui/icons";
import { ListItemRow } from "./ListItemRow";
import type { ListItem, ListView } from "@/types";

interface ListColumnProps {
  list: ListView;
  isFirst: boolean;
  isLast: boolean;
  onRename: (list: ListView, name: string) => void;
  onDelete: (listId: string) => void;
  onMove: (listId: string, dir: -1 | 1) => void;
  onAddItem: (listId: string, text: string) => void;
  onToggleItem: (item: ListItem) => void;
  onUpdateItemText: (item: ListItem, text: string) => void;
  onOpenItem: (item: ListItem) => void;
}

export function ListColumn({
  list,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMove,
  onAddItem,
  onToggleItem,
  onUpdateItemText,
  onOpenItem,
}: ListColumnProps) {
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(list.name);

  const incomplete = list.items.filter((i) => !i.completed);
  const completed = list.items.filter((i) => i.completed);

  const { setNodeRef, isOver } = useDroppable({
    id: `list:${list.id}`,
    data: { type: "list", listId: list.id },
  });

  return (
    <div className="flex w-[280px] shrink-0 flex-col sm:w-[260px]">
      <div className="group/head mb-1 flex items-center gap-1.5 border-b border-line pb-1.5">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              onRename(list, nameDraft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingName(false);
                onRename(list, nameDraft);
              }
            }}
            className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wide text-brand-600 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setNameDraft(list.name);
              setEditingName(true);
            }}
            className="flex-1 text-left text-xs font-bold uppercase tracking-wide text-brand-600"
          >
            {list.name}{" "}
            <span className="text-faint">{list.items.length}</span>
          </button>
        )}
        <div className="flex items-center gap-0.5 text-faint">
          <button
            onClick={() => onMove(list.id, -1)}
            disabled={isFirst}
            aria-label="Move list left"
            className="rounded p-0.5 text-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onMove(list.id, 1)}
            disabled={isLast}
            aria-label="Move list right"
            className="rounded p-0.5 text-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onDelete(list.id)}
            aria-label="Delete list"
            className="rounded p-0.5 text-faint hover:text-danger"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[40px] rounded-md transition-colors",
          isOver && "bg-brand-50",
        )}
      >
        <SortableContext
          items={incomplete.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {incomplete.map((item) => (
            <ListItemRow
              key={item.id}
              item={item}
              sortable
              onToggle={onToggleItem}
              onUpdateText={onUpdateItemText}
              onOpenDetail={onOpenItem}
            />
          ))}
        </SortableContext>

        <div className="px-1 py-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                onAddItem(list.id, draft);
                setDraft("");
              }
            }}
            placeholder="Add item…"
            className="w-full bg-transparent text-xs text-ink placeholder:text-faint/70 outline-none"
          />
        </div>

        {completed.map((item) => (
          <ListItemRow
            key={item.id}
            item={item}
            sortable={false}
            onToggle={onToggleItem}
            onUpdateText={onUpdateItemText}
            onOpenDetail={onOpenItem}
          />
        ))}
      </div>
    </div>
  );
}
