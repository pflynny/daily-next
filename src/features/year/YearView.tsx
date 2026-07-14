"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/ToastProvider";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, NoteIcon, StackIcon, StarIcon } from "@/shared/ui/icons";
import { Markdown } from "@/shared/ui/Markdown";
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
  const [view, setView] = useState<"lists" | "quotes">("lists");
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
      <PageHeader title={view === "quotes" ? "QUOTES" : `YEAR ${selectedYear}`}>
        <div className="flex items-center rounded-lg border border-line p-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <button
            onClick={() => setView("lists")}
            className={cn(
              "rounded-md px-2 py-1",
              view === "lists" ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Lists
          </button>
          <button
            onClick={() => setView("quotes")}
            className={cn(
              "rounded-md px-2 py-1",
              view === "quotes" ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Quotes
          </button>
        </div>
        {view === "lists" && (
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
        )}
      </PageHeader>

      {/* Year tabs */}
      {view === "lists" && (
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
      )}

      <Screen>
        {view === "quotes" ? (
          col.notedByYear.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
              <NoteIcon size={40} className="text-brand-300" />
              <h2 className="mt-4 text-sm font-semibold text-ink">
                No notes yet
              </h2>
              <p className="mt-1 text-sm text-muted">
                Open an entry and add “Notes &amp; quotes” — passages and page
                references collect here for reading back.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-8 p-4 pb-12">
              {col.notedByYear.map(([year, entries]) => (
                <section key={year}>
                  <h2 className="mb-3 font-mono text-2xl font-bold tracking-tight text-brand-700">
                    {year}
                  </h2>
                  <div className="space-y-4">
                    {entries.map(({ item, collectionName }) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-line bg-surface p-4"
                      >
                        <button
                          onClick={() => setDetailItem(item)}
                          className="mb-2 flex w-full items-baseline justify-between gap-3 text-left"
                        >
                          <span className="min-w-0">
                            <span className="text-sm font-semibold text-ink">
                              {item.title}
                            </span>
                            {item.creator && (
                              <span className="text-xs text-muted">
                                {" "}
                                · {item.creator}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                              {collectionName}
                            </span>
                            {typeof item.rating === "number" && (
                              <span className="text-[11px] font-bold text-brand-600">
                                {item.rating}/10
                              </span>
                            )}
                          </span>
                        </button>
                        <Markdown>{item.notes}</Markdown>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : collections.length === 0 ? (
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
