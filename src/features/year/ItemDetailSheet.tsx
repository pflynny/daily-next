"use client";

import { Sheet } from "@/shared/ui/Sheet";
import { TrashIcon } from "@/shared/ui/icons";
import type { CollectionItem, CollectionMediaType } from "@/types";

const MEDIA_TYPES: { value: CollectionMediaType; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

interface ItemDetailSheetProps {
  item: CollectionItem | null;
  onClose: () => void;
  onUpdate: (item: CollectionItem, patch: Partial<CollectionItem>) => void;
  onDelete: (item: CollectionItem) => void;
}

export function ItemDetailSheet({
  item,
  onClose,
  onUpdate,
  onDelete,
}: ItemDetailSheetProps) {
  if (!item) return null;

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title="Entry"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              onDelete(item);
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
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Title
        </span>
        <input
          value={item.title}
          onChange={(e) => onUpdate(item, { title: e.target.value })}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Author / creator
        </span>
        <input
          value={item.creator}
          onChange={(e) => onUpdate(item, { creator: e.target.value })}
          placeholder="e.g. Cormac McCarthy"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <div className="mb-3 flex gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Type
          </span>
          <select
            value={item.mediaType}
            onChange={(e) =>
              onUpdate(item, {
                mediaType: e.target.value as CollectionMediaType,
              })
            }
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            {MEDIA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            My rating
          </span>
          <select
            value={item.rating ?? ""}
            onChange={(e) =>
              onUpdate(item, {
                rating: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">No rating</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}/10
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          My review
        </span>
        <textarea
          value={item.review}
          onChange={(e) => onUpdate(item, { review: e.target.value })}
          rows={5}
          placeholder="What did you think?"
          className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
    </Sheet>
  );
}
