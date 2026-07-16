"use client";

import { Fragment, useEffect, useState } from "react";
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
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

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

  const viewControls = (
    <>
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
      {view === "year" && <YearPicker year={year} onChange={setYear} min={1900} />}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="MEMORIES"
        subtitle={timeline.length ? `${timeline.length} captured` : undefined}
        below={
          <div className="mt-2 flex items-center gap-2 sm:hidden">
            {viewControls}
          </div>
        }
      >
        <div className="hidden items-center gap-2 sm:flex">{viewControls}</div>
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
          <div
            className={cn(
              "mx-auto px-4 py-4",
              // wide canvas for the two-column timeline; narrower reading
              // measure for the condensed all-history list
              view === "year" ? "max-w-[1400px]" : "max-w-3xl",
            )}
          >
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
                                  onViewImage={setLightbox}
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
                  onViewImage={setLightbox}
                />
              </section>
            )}
          </div>
        )}
      </Screen>

      {lightbox && (
        <button
          onClick={() => setLightbox(null)}
          aria-label="Close photo"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </button>
      )}

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

type MarkerPos = "mobile" | "left" | "right" | "wide";

function TimelineMarker({ m, pos }: { m: MemoryView; pos: MarkerPos }) {
  const place =
    pos === "mobile"
      ? m.milestone
        ? "-left-[34px] top-3.5"
        : "-left-[27px] top-5"
      : pos === "left"
        ? "left-auto -right-[24px] translate-x-1/2 top-4"
        : pos === "right"
          ? "-left-[24px] -translate-x-1/2 top-4"
          : "left-1/2 -translate-x-1/2 top-4";
  if (m.milestone) {
    return (
      <span
        className={cn(
          "absolute z-10 flex items-center justify-center rounded-full bg-paper p-0.5",
          place,
        )}
      >
        <StarIcon size={15} className="fill-brand-500 text-brand-500" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "absolute z-10 size-2.5 rounded-full border-2 border-paper bg-brand-400",
        place,
      )}
    />
  );
}

type Segment =
  | { kind: "wide"; m: MemoryView }
  | { kind: "run"; items: MemoryView[] };

function segmentsOf(items: MemoryView[]): Segment[] {
  // Runs of normal cards flow as two independent staggered columns (no
  // paired row heights, so no gaps); full-width cards break the run.
  const segments: Segment[] = [];
  for (const m of items) {
    if (m.fullWidth) {
      segments.push({ kind: "wide", m });
    } else {
      const last = segments[segments.length - 1];
      if (last?.kind === "run") last.items.push(m);
      else segments.push({ kind: "run", items: [m] });
    }
  }
  return segments;
}

function monthGroupsOf(items: MemoryView[]) {
  const groups: { key: string; label: string; items: MemoryView[] }[] = [];
  for (const m of items) {
    const key = m.occurredOn.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(m);
    } else {
      groups.push({
        key,
        label: new Date(`${m.occurredOn}T00:00:00`).toLocaleDateString(
          undefined,
          { month: "long" },
        ),
        items: [m],
      });
    }
  }
  return groups;
}

function TimelineGrid({
  items,
  onEdit,
  onDelete,
  onViewImage,
}: {
  items: MemoryView[];
  onEdit: (m: MemoryView) => void;
  onDelete: (m: MemoryView) => void;
  onViewImage: (url: string) => void;
}) {
  // Month blocks keep the staggered columns from drifting across time:
  // the columns can only get out of step within a single month.
  const months = monthGroupsOf(items);

  return (
    <>
      {/* Mobile: single column */}
      <ol className="relative ml-1 border-l border-line sm:hidden">
        {months.map((g) => (
          <Fragment key={g.key}>
            <li className="mb-2 ml-6 text-[10px] font-semibold uppercase tracking-wide text-faint">
              {g.label}
            </li>
            {g.items.map((m) => (
              <li key={m.id} className="relative mb-5 ml-6">
                <TimelineMarker m={m} pos="mobile" />
                <MemoryCard memory={m} onEdit={onEdit} onDelete={onDelete} onViewImage={onViewImage} />
              </li>
            ))}
          </Fragment>
        ))}
      </ol>

      {/* Desktop: staggered two-column timeline around a center rail */}
      <div className="relative hidden before:absolute before:bottom-0 before:left-1/2 before:top-0 before:w-px before:-translate-x-1/2 before:bg-line before:content-[''] sm:block">
        {months.map((g) => (
          <div key={g.key}>
            <div className="relative z-10 mb-4 flex justify-center">
              <span className="rounded-full border border-line bg-paper px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                {g.label}
              </span>
            </div>
            {segmentsOf(g.items).map((seg, si) =>
              seg.kind === "wide" ? (
                <div key={seg.m.id} className="relative mb-5">
                  <TimelineMarker m={seg.m} pos="wide" />
                  <MemoryCard memory={seg.m} onEdit={onEdit} onDelete={onDelete} onViewImage={onViewImage} />
                </div>
              ) : (
                <div key={si} className="mb-5 grid grid-cols-2 gap-x-12">
                  <div className="flex flex-col gap-5">
                    {seg.items
                      .filter((_, i) => i % 2 === 0)
                      .map((m) => (
                        <div key={m.id} className="relative">
                          <TimelineMarker m={m} pos="left" />
                          <MemoryCard memory={m} onEdit={onEdit} onDelete={onDelete} onViewImage={onViewImage} />
                        </div>
                      ))}
                  </div>
                  <div className="flex flex-col gap-5 pt-8">
                    {seg.items
                      .filter((_, i) => i % 2 === 1)
                      .map((m) => (
                        <div key={m.id} className="relative">
                          <TimelineMarker m={m} pos="right" />
                          <MemoryCard memory={m} onEdit={onEdit} onDelete={onDelete} onViewImage={onViewImage} />
                        </div>
                      ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </>
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
