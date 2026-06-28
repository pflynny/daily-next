"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/ToastProvider";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, StackIcon, StarIcon } from "@/shared/ui/icons";
import { useCollections } from "./useCollections";
import { CollectionColumn } from "./CollectionColumn";
import { ItemDetailSheet } from "./ItemDetailSheet";
import type { CollectionItem, CollectionView } from "@/types";

const STARTERS = ["Books", "Movies", "TV Shows", "Music"];

export function YearView() {
  const col = useCollections();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [sort, setSort] = useState<"added" | "rating">("added");
  const [detailItem, setDetailItem] = useState<CollectionItem | null>(null);
  const [confirmCollection, setConfirmCollection] =
    useState<CollectionView | null>(null);
  const [newCollection, setNewCollection] = useState("");

  const yearTabs = Array.from(
    new Set([...col.years, currentYear, selectedYear]),
  ).sort((a, b) => b - a);

  const collections = col.forYear(selectedYear);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={`YEAR ${selectedYear}`}>
        <button
          onClick={() => setSort((s) => (s === "added" ? "rating" : "added"))}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide",
            sort === "rating"
              ? "border-brand-500 text-brand-700"
              : "border-line text-muted hover:text-ink",
          )}
        >
          <StarIcon size={14} /> {sort === "rating" ? "Top rated" : "Recent"}
        </button>
      </PageHeader>

      {/* Year tabs */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-line px-4 py-2">
        <button
          onClick={() => setSelectedYear((y) => y - 1)}
          aria-label="Earlier year"
          className="shrink-0 rounded-md p-1 text-muted hover:text-ink"
        >
          <ChevronLeft size={16} />
        </button>
        {yearTabs.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold",
              year === selectedYear
                ? "border-brand-500 text-ink"
                : "border-line text-muted hover:text-ink",
            )}
          >
            {year}
          </button>
        ))}
      </div>

      <Screen>
        {collections.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
            <StackIcon size={40} className="text-brand-300" />
            <h2 className="mt-4 text-sm font-semibold text-ink">
              Nothing logged for {selectedYear}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Start a list and add what you read, watched and listened to —
              with a rating and a short review.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {STARTERS.map((name) => (
                <button
                  key={name}
                  onClick={() => col.addCollection(selectedYear, name)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand-300 hover:text-ink"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="thin-scrollbar flex flex-col gap-4 p-4 md:flex-row md:items-start md:overflow-x-auto">
            {collections.map((collection, i) => (
              <CollectionColumn
                key={collection.id}
                collection={collection}
                sort={sort}
                isFirst={i === 0}
                isLast={i === collections.length - 1}
                onRename={col.renameCollection}
                onDelete={setConfirmCollection}
                onMove={(id, dir) => col.moveCollection(selectedYear, id, dir)}
                onAddItem={col.addItem}
                onOpenItem={setDetailItem}
                onSetBanner={col.setBanner}
              />
            ))}
            <div className="shrink-0 md:w-[200px]">
              <input
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCollection.trim()) {
                    col.addCollection(selectedYear, newCollection);
                    setNewCollection("");
                  }
                }}
                placeholder="+ New list"
                className="w-full bg-transparent px-1 py-2 text-sm font-semibold uppercase tracking-wide text-muted placeholder:text-faint outline-none"
              />
            </div>
          </div>
        )}
      </Screen>

      <ItemDetailSheet
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onUpdate={(item, patch) => {
          col.updateItem(item, patch);
          setDetailItem((cur) => (cur ? { ...cur, ...patch } : cur));
        }}
        onDelete={(item) => {
          const restore = col.deleteItem(item.id);
          toast.undo("Entry deleted", restore);
        }}
      />

      <ConfirmDialog
        open={!!confirmCollection}
        title="Delete list?"
        message={
          confirmCollection
            ? `“${confirmCollection.name}” and everything in it will be removed.`
            : undefined
        }
        onCancel={() => setConfirmCollection(null)}
        onConfirm={() => {
          if (confirmCollection) {
            const restore = col.deleteCollection(confirmCollection.id);
            toast.undo("List deleted", restore);
          }
          setConfirmCollection(null);
        }}
      />
    </div>
  );
}
