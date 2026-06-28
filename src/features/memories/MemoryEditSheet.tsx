"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/shared/ui/Sheet";
import type { Memory } from "@/types";

interface MemoryEditSheetProps {
  memory: Memory | null;
  onClose: () => void;
  onSave: (memory: Memory, patch: Partial<Memory>) => void;
}

export function MemoryEditSheet({ memory, onClose, onSave }: MemoryEditSheetProps) {
  const [occurredOn, setOccurredOn] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (memory) {
      setOccurredOn(memory.occurredOn);
      setTitle(memory.title);
      setBody(memory.body);
      setAuthor(memory.quoteAuthor);
      setLinkUrl(memory.linkUrl);
    }
  }, [memory]);

  if (!memory) return null;

  function save() {
    if (!memory) return;
    onSave(memory, {
      occurredOn,
      title: title.trim(),
      body: body.trim(),
      quoteAuthor: author.trim(),
      linkUrl: linkUrl.trim(),
    });
    onClose();
  }

  return (
    <Sheet
      open={!!memory}
      onClose={onClose}
      title="Edit memory"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
          >
            Save
          </button>
        </div>
      }
    >
      <label className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          When
        </span>
        <input
          type="date"
          value={occurredOn}
          onChange={(e) => e.target.value && setOccurredOn(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {memory.type === "link" && (
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://…"
          className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      )}

      {memory.type !== "quote" && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={memory.type === "quote" ? 4 : 4}
        placeholder={memory.type === "quote" ? "The quote…" : "Caption / notes"}
        className={
          memory.type === "quote"
            ? "mb-3 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 font-serif text-base italic outline-none focus:border-brand-400"
            : "mb-3 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        }
      />

      {memory.type === "quote" && (
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Who said it"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      )}
    </Sheet>
  );
}
