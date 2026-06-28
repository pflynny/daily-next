"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/shared/ui/Sheet";
import { cn } from "@/lib/utils/cn";
import { todayKey } from "@/lib/utils/date";
import {
  LinkIcon,
  PhotoIcon,
  QuoteIcon,
  TextIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "@/shared/ui/icons";
import { uploadMedia, type UploadedMedia } from "@/lib/storage/upload";
import type { MemoryType } from "@/types";
import type { NewMemoryInput } from "./useMemories";

const TYPES: { value: MemoryType; label: string; Icon: typeof TextIcon }[] = [
  { value: "note", label: "Note", Icon: TextIcon },
  { value: "quote", label: "Quote", Icon: QuoteIcon },
  { value: "photo", label: "Photo", Icon: PhotoIcon },
  { value: "video", label: "Video", Icon: VideoIcon },
  { value: "link", label: "Link", Icon: LinkIcon },
];

interface AddMemorySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewMemoryInput) => void;
}

export function AddMemorySheet({ open, onClose, onSubmit }: AddMemorySheetProps) {
  const [type, setType] = useState<MemoryType>("note");
  const [occurredOn, setOccurredOn] = useState(todayKey());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setType("note");
      setOccurredOn(todayKey());
      setTitle("");
      setBody("");
      setAuthor("");
      setLinkUrl("");
      setMedia([]);
      setError(null);
    }
  }, [open]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: UploadedMedia[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMedia(file));
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const canSave =
    !uploading &&
    ((type === "note" && (title.trim() || body.trim())) ||
      (type === "quote" && body.trim()) ||
      (type === "link" && linkUrl.trim()) ||
      ((type === "photo" || type === "video") && media.length > 0));

  function save() {
    if (!canSave) return;
    onSubmit({ occurredOn, type, title, body, quoteAuthor: author, linkUrl, media });
    onClose();
  }

  const isMediaType = type === "photo" || type === "video";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New memory"
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
            disabled={!canSave}
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Save memory"}
          </button>
        </div>
      }
    >
      {/* type chooser */}
      <div className="mb-4 grid grid-cols-5 gap-2">
        {TYPES.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setType(value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-medium transition-colors",
              type === value
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-line text-muted hover:text-ink",
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* date */}
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

      {/* type-specific fields */}
      {type === "quote" ? (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="“The quote…”"
            className="mb-3 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 font-serif text-base italic outline-none focus:border-brand-400"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Who said it"
            className="mb-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </>
      ) : type === "link" ? (
        <>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            inputMode="url"
            className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Why it matters (optional)"
            className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </>
      ) : (
        <>
          {type === "note" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mb-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          )}
          {isMediaType && (
            <div className="mb-3">
              <input
                ref={fileRef}
                type="file"
                accept={type === "video" ? "video/*" : "image/*"}
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-6 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                <UploadIcon size={18} />
                {uploading
                  ? "Uploading…"
                  : `Add ${type === "video" ? "video" : "photos"}`}
              </button>
              {media.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {media.map((m, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-sand"
                    >
                      {m.kind === "video" ? (
                        <video src={m.url} className="size-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                      <button
                        onClick={() =>
                          setMedia((prev) => prev.filter((_, j) => j !== i))
                        }
                        aria-label="Remove"
                        className="absolute right-1 top-1 rounded-full bg-ink/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={isMediaType ? 2 : 5}
            placeholder={isMediaType ? "Caption (optional)" : "What happened…"}
            className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
    </Sheet>
  );
}
