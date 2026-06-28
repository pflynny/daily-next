"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ImagesIcon, PlusIcon } from "@/shared/ui/icons";
import { useMemories } from "./useMemories";
import { MemoryCard } from "./MemoryCard";
import { AddMemorySheet } from "./AddMemorySheet";
import { MemoryEditSheet } from "./MemoryEditSheet";
import type { Memory, MemoryView } from "@/types";

export function MemoriesView() {
  const { byYear, timeline, addMemory, updateMemory, deleteMemory } =
    useMemories();
  const [adding, setAdding] = useState(false);
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemoryView | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="MEMORIES"
        subtitle={timeline.length ? `${timeline.length} captured` : undefined}
      >
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
          <div className="mx-auto max-w-2xl px-4 py-6">
            {byYear.map(([year, items]) => (
              <section key={year} className="mb-8">
                <h2 className="mb-4 font-mono text-2xl font-bold tracking-tight text-brand-700">
                  {year}
                </h2>
                <ol className="relative ml-1 border-l border-line">
                  {items.map((memory) => (
                    <li key={memory.id} className="relative mb-5 ml-6">
                      <span className="absolute -left-[27px] top-5 size-2.5 rounded-full border-2 border-paper bg-brand-400" />
                      <MemoryCard
                        memory={memory}
                        onEdit={setEditMemory}
                        onDelete={setConfirmDelete}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
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
        onSave={updateMemory}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete memory?"
        message="This will permanently remove it from your timeline."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteMemory(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
