"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/shared/ui/Sheet";
import { cn } from "@/lib/utils/cn";
import { UploadIcon, XIcon } from "@/shared/ui/icons";
import { uploadMedia, type UploadedMedia } from "@/lib/storage/upload";
import type { Memory, MemoryView } from "@/types";

export interface MediaChanges {
  removeIds: string[];
  add: UploadedMedia[];
}

interface MemoryEditSheetProps {
  memory: MemoryView | null;
  onClose: () => void;
  onSave: (memory: MemoryView, patch: Partial<Memory>, media: MediaChanges) => void;
}

export function MemoryEditSheet({ memory, onClose, onSave }: MemoryEditSheetProps) {
  const [occurredOn, setOccurredOn] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [newMedia, setNewMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (memory) {
      setOccurredOn(memory.occurredOn);
      setTitle(memory.title);
      setBody(memory.body);
      setAuthor(memory.quoteAuthor);
      setLinkUrl(memory.linkUrl);
      setRemoveIds([]);
      setNewMedia([]);
      setError(null);
    }
  }, [memory]);

  if (!memory) return null;

  const showMedia =
    memory.type === "photo" || memory.type === "video" || memory.media.length > 0;
  const keptMedia = memory.media.filter((m) => !removeIds.includes(m.id));

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: UploadedMedia[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMedia(file));
      }
      setNewMedia((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    if (!memory || uploading) return;
    onSave(
      memory,
      {
        occurredOn,
        title: title.trim(),
        body: body.trim(),
        quoteAuthor: author.trim(),
        linkUrl: linkUrl.trim(),
      },
      { removeIds, add: newMedia },
    );
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
            disabled={uploading}
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Save"}
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

      {showMedia && (
        <div className="mb-3">
          {(keptMedia.length > 0 || newMedia.length > 0) && (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {keptMedia.map((m) => (
                <MediaThumb
                  key={m.id}
                  url={m.url}
                  kind={m.kind}
                  onRemove={() => setRemoveIds((prev) => [...prev, m.id])}
                />
              ))}
              {newMedia.map((m, i) => (
                <MediaThumb
                  key={`new-${i}`}
                  url={m.url}
                  kind={m.kind}
                  isNew
                  onRemove={() =>
                    setNewMedia((prev) => prev.filter((_, j) => j !== i))
                  }
                />
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={memory.type === "video" ? "video/*" : "image/*"}
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            <UploadIcon size={16} />
            {uploading
              ? "Uploading…"
              : `Add ${memory.type === "video" ? "video" : "photos"}`}
          </button>
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
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

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
    </Sheet>
  );
}

function MediaThumb({
  url,
  kind,
  isNew,
  onRemove,
}: {
  url: string;
  kind: "image" | "video";
  isNew?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg border bg-sand",
        isNew ? "border-brand-400" : "border-line",
      )}
    >
      {kind === "video" ? (
        <video src={url} className="size-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
      <button
        onClick={onRemove}
        aria-label="Remove media"
        className="absolute right-1 top-1 rounded-full bg-ink/60 p-1 text-white hover:bg-danger"
      >
        <XIcon size={12} />
      </button>
    </div>
  );
}
