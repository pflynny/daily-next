"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, TrashIcon } from "@/shared/ui/icons";
import { CollectionItemRow } from "./CollectionItemRow";
import type { CollectionItem, CollectionView } from "@/types";

interface CollectionColumnProps {
  collection: CollectionView;
  sort: "added" | "rating";
  isFirst: boolean;
  isLast: boolean;
  onRename: (collection: CollectionView, name: string) => void;
  onDelete: (collection: CollectionView) => void;
  onMove: (collectionId: string, dir: -1 | 1) => void;
  onAddItem: (collectionId: string, title: string) => void;
  onOpenItem: (item: CollectionItem) => void;
}

export function CollectionColumn({
  collection,
  sort,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMove,
  onAddItem,
  onOpenItem,
}: CollectionColumnProps) {
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(collection.name);

  const items =
    sort === "rating"
      ? [...collection.items].sort(
          (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
        )
      : collection.items;

  return (
    <div className="flex w-full shrink-0 flex-col rounded-2xl border border-line bg-surface p-3 md:w-[280px]">
      <div className="group/head mb-1 flex items-center gap-1.5 border-b border-line pb-2">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              onRename(collection, nameDraft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingName(false);
                onRename(collection, nameDraft);
              }
            }}
            className="flex-1 bg-transparent text-sm font-bold uppercase tracking-wide text-brand-700 outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setNameDraft(collection.name);
              setEditingName(true);
            }}
            className="flex-1 text-left text-sm font-bold uppercase tracking-wide text-brand-700"
          >
            {collection.name}{" "}
            <span className="text-faint">{collection.items.length}</span>
          </button>
        )}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/head:opacity-100">
          <button
            onClick={() => onMove(collection.id, -1)}
            disabled={isFirst}
            aria-label="Move left"
            className="rounded p-0.5 text-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onMove(collection.id, 1)}
            disabled={isLast}
            aria-label="Move right"
            className="rounded p-0.5 text-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onDelete(collection)}
            aria-label="Delete list"
            className="rounded p-0.5 text-faint hover:text-danger"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      <div>
        {collection.items.length === 0 && (
          <p className="px-1 py-3 text-xs text-faint">Nothing here yet.</p>
        )}
        {items.map((item) => (
          <CollectionItemRow key={item.id} item={item} onClick={onOpenItem} />
        ))}
      </div>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onAddItem(collection.id, draft);
            setDraft("");
          }
        }}
        placeholder="Add a title…"
        className="mt-1 w-full bg-transparent px-1 py-2 text-sm text-ink placeholder:text-faint/70 outline-none"
      />
    </div>
  );
}
