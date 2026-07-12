"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/ToastProvider";
import {
  ChevronDown,
  ImagesIcon,
  LinkIcon,
  PhotoIcon,
  PlusIcon,
  QuoteIcon,
  StarIcon,
  TextIcon,
  VideoIcon,
} from "@/shared/ui/icons";
import { YearPicker } from "@/shared/ui/YearPicker";
import { cn } from "@/lib/utils/cn";
import { useMemories } from "./useMemories";
import { MemoryCard } from "./MemoryCard";
import { AddMemorySheet } from "./AddMemorySheet";
import { MemoryEditSheet } from "./MemoryEditSheet";
import type { MemoryType, MemoryView } from "@/types";

type Filter = "all" | "milestone" | MemoryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "milestone", label: "★ Milestones" },
  { value: "note", label: "Notes" },
  { value: "quote", label: "Quotes" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "link", label: "Links" },
];

function matchesFilter(m: MemoryView, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "milestone") return m.milestone;
  return m.type === filter;
}

export function MemoriesView() {
  const { byYear, timeline, addMemory, updateMemory, setMemoryMedia, deleteMemory } =
    useMemories();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [view, setView] = useState<"year" | "all">("year");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [editMemory, setEditMemory] = useState<MemoryView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemoryView | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const yearItems = byYear.find(([y]) => y === year)?.[1] ?? [];
  const items = yearItems.filter((m) => matchesFilter(m, filter));

  const allByYear = byYear
    .map(
      ([y, list]) =>
        [y, list.filter((m) => matchesFilter(m, filter))] as const,
    )
    .filter(([, list]) => list.length > 0);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="MEMORIES"
        subtitle={timeline.length ? `${timeline.length} captured` : undefined}
      >
        <div className="flex items-center rounded-lg border border-line p-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <button
            onClick={() => setView("year")}
            className={cn(
              "rounded-md px-2 py-1",
              view === "year" ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Year
          </button>
          <button
            onClick={() => setView("all")}
            className={cn(
              "rounded-md px-2 py-1",
              view === "all" ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            All
          </button>
        </div>
        {view === "year" && (
          <YearPicker year={year} onChange={setYear} min={1900} />
        )}
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
        >
          <PlusIcon size={15} /> Add
        </button>
      </PageHeader>

      <Screen>
        {timeline.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
            <ImagesIcon size={40} className="text-brand-300" />
            <h2 className="mt-4 text-sm font-semibold text-ink">
              Your timeline is empty
            </h2>
            <p className="mt-1 text-sm text-muted">
              Capture a moment — a note, a quote, a photo, a video or a link.
              Memories are grouped by year so you can look back.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-5 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
            >
              <PlusIcon size={15} /> Add a memory
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-4">
            <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
                    filter === f.value
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-line text-muted hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {view === "all" ? (
              allByYear.length === 0 ? (
                <p className="px-1 py-12 text-center text-sm text-faint">
                  No {filter === "all" ? "" : `${filter} `}memories yet.
                </p>
              ) : (
                allByYear.map(([y, list]) => (
                  <section key={y} className="mb-7">
                    <h2 className="mb-2 font-mono text-xl font-bold tracking-tight text-brand-700">
                      {y}
                    </h2>
                    <ol className="relative ml-1 border-l border-line">
                      {list.map((memory) => {
                        const isOpen = expanded.has(memory.id);
                        return (
                          <li key={memory.id} className="relative ml-5">
                            {memory.milestone ? (
                              <span className="absolute -left-[31px] top-1.5 flex items-center justify-center rounded-full bg-paper p-0.5">
                                <StarIcon
                                  size={12}
                                  className="fill-brand-500 text-brand-500"
                                />
                              </span>
                            ) : (
                              <span className="absolute -left-[24px] top-3 size-1.5 rounded-full bg-brand-400" />
                            )}
                            <CompactRow
                              memory={memory}
                              open={isOpen}
                              onToggle={() => toggleExpanded(memory.id)}
                            />
                            {isOpen && (
                              <div className="mb-3 mt-1">
                                <MemoryCard
                                  memory={memory}
                                  onEdit={setEditMemory}
                                  onDelete={setConfirmDelete}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))
              )
            ) : items.length === 0 ? (
              <p className="px-1 py-12 text-center text-sm text-faint">
                No {filter === "all" ? "" : `${filter} `}memories in {year} yet.
              </p>
            ) : (
              <section className="mb-8">
                <h2 className="mb-4 font-mono text-2xl font-bold tracking-tight text-brand-700">
                  {year}
                </h2>
                <TimelineGrid
                  items={items}
                  onEdit={setEditMemory}
                  onDelete={setConfirmDelete}
                />
              </section>
            )}
          </div>
        )}
      </Screen>

      <AddMemorySheet
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={addMemory}
      />

      <MemoryEditSheet
        memory={editMemory}
        onClose={() => setEditMemory(null)}
        onSave={(memory, patch, media) => {
          updateMemory(memory, patch);
          setMemoryMedia(memory.id, media.removeIds, media.add);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete memory?"
        message="This will permanently remove it from your timeline."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const restore = deleteMemory(confirmDelete.id);
            toast.undo("Memory deleted", restore);
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

/* --------------- Alternating two-column timeline ------------------- */

function TimelineGrid({
  items,
  onEdit,
  onDelete,
}: {
  items: MemoryView[];
  onEdit: (m: MemoryView) => void;
  onDelete: (m: MemoryView) => void;
}) {
  // Alternate non-wide cards left/right; full-width cards span both columns.
  let flip = 0;
  const placed = items.map((m) => {
    if (m.fullWidth) return { m, pos: "wide" as const };
    const pos = flip % 2 === 0 ? ("left" as const) : ("right" as const);
    flip += 1;
    return { m, pos };
  });

  return (
    <ol className="relative ml-1 border-l border-line sm:ml-0 sm:grid sm:grid-cols-2 sm:gap-x-12 sm:border-l-0 sm:before:absolute sm:before:bottom-0 sm:before:left-1/2 sm:before:top-0 sm:before:w-px sm:before:-translate-x-1/2 sm:before:bg-line sm:before:content-['']">
      {placed.map(({ m, pos }) => (
        <li
          key={m.id}
          className={cn(
            "relative mb-5 ml-6 sm:ml-0",
            pos === "wide" && "sm:col-span-2",
            pos === "left" && "sm:col-start-1",
            pos === "right" && "sm:col-start-2",
          )}
        >
          {m.milestone ? (
            <span
              className={cn(
                "absolute -left-[34px] top-3.5 z-10 flex items-center justify-center rounded-full bg-paper p-0.5",
                pos === "left" &&
                  "sm:left-auto sm:-right-[24px] sm:translate-x-1/2",
                pos === "right" && "sm:-left-[24px] sm:-translate-x-1/2",
                pos === "wide" && "sm:left-1/2 sm:-translate-x-1/2",
              )}
            >
              <StarIcon size={15} className="fill-brand-500 text-brand-500" />
            </span>
          ) : (
            <span
              className={cn(
                "absolute -left-[27px] top-5 z-10 size-2.5 rounded-full border-2 border-paper bg-brand-400",
                pos === "left" &&
                  "sm:left-auto sm:-right-[24px] sm:translate-x-1/2",
                pos === "right" && "sm:-left-[24px] sm:-translate-x-1/2",
                pos === "wide" && "sm:left-1/2 sm:-translate-x-1/2",
              )}
            />
          )}
          <MemoryCard memory={m} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Condensed lifetime-view row ---------------------- */

const ROW_ICONS = {
  note: TextIcon,
  quote: QuoteIcon,
  photo: PhotoIcon,
  video: VideoIcon,
  link: LinkIcon,
};

function shortDay(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function rowLabel(memory: MemoryView): string {
  if (memory.title) return memory.title;
  if (memory.body) return memory.body;
  if (memory.linkUrl) return memory.linkUrl;
  return memory.type;
}

function CompactRow({
  memory,
  open,
  onToggle,
}: {
  memory: MemoryView;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = ROW_ICONS[memory.type];
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="group flex w-full items-center gap-2 py-1.5 text-left"
    >
      <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-faint">
        {shortDay(memory.occurredOn)}
      </span>
      <Icon size={13} className="shrink-0 text-brand-400" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          memory.milestone || open
            ? "font-semibold text-ink"
            : "text-ink/90 group-hover:text-ink",
        )}
      >
        {rowLabel(memory)}
      </span>
      <ChevronDown
        size={13}
        className={cn(
          "shrink-0 text-faint transition-transform",
          open && "rotate-180",
        )}
      />
    </button>
  );
}
