"use client";

import { cn } from "@/lib/utils/cn";
import { fromDateKey } from "@/lib/utils/date";
import {
  LinkIcon,
  PencilIcon,
  PhotoIcon,
  QuoteIcon,
  StarIcon,
  TextIcon,
  TrashIcon,
  VideoIcon,
} from "@/shared/ui/icons";
import type { MemoryView } from "@/types";

const TYPE_ICON = {
  note: TextIcon,
  quote: QuoteIcon,
  photo: PhotoIcon,
  video: VideoIcon,
  link: LinkIcon,
};

function shortDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: {
  memory: MemoryView;
  onEdit: (memory: MemoryView) => void;
  onDelete: (memory: MemoryView) => void;
}) {
  const Icon = TYPE_ICON[memory.type];
  const cols =
    memory.media.length === 1
      ? "grid-cols-1"
      : memory.media.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-surface p-4",
        memory.milestone ? "border-brand-400 ring-1 ring-brand-200" : "border-line",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-faint">
        {memory.milestone && (
          <StarIcon size={13} className="fill-brand-500 text-brand-500" />
        )}
        <Icon size={14} className="text-brand-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {shortDate(memory.occurredOn)}
        </span>
        <div className="ml-auto flex items-center gap-0.5 hover-reveal">
          <button
            onClick={() => onEdit(memory)}
            aria-label="Edit memory"
            className="rounded p-1 hover:text-ink"
          >
            <PencilIcon size={14} />
          </button>
          <button
            onClick={() => onDelete(memory)}
            aria-label="Delete memory"
            className="rounded p-1 hover:text-danger"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {memory.type === "quote" ? (
        <blockquote>
          <p className="font-serif text-lg italic leading-snug text-ink">
            {memory.body}
          </p>
          {memory.quoteAuthor && (
            <footer className="mt-2 text-xs text-muted">
              — {memory.quoteAuthor}
            </footer>
          )}
        </blockquote>
      ) : memory.type === "link" ? (
        <a
          href={memory.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-line bg-paper p-3 transition-colors hover:border-brand-300"
        >
          <div className="text-sm font-semibold text-ink">
            {memory.title || hostname(memory.linkUrl)}
          </div>
          <div className="mt-0.5 truncate text-xs text-brand-600">
            {hostname(memory.linkUrl)}
          </div>
          {memory.body && (
            <p className="mt-1.5 text-sm text-muted">{memory.body}</p>
          )}
        </a>
      ) : (
        <>
          {memory.title && (
            <h3 className="mb-1 text-sm font-semibold text-ink">
              {memory.title}
            </h3>
          )}
          {memory.media.length > 0 && (
            <div className={cn("mb-2 grid gap-1.5", cols)}>
              {memory.media.map((m) =>
                m.kind === "video" ? (
                  <video
                    key={m.id}
                    src={m.url}
                    controls
                    className="w-full rounded-lg border border-line bg-ink/5"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={m.url}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "w-full rounded-lg border border-line bg-sand object-cover",
                      memory.media.length === 1 ? "max-h-96 object-contain" : "aspect-square",
                    )}
                  />
                ),
              )}
            </div>
          )}
          {memory.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
              {memory.body}
            </p>
          )}
        </>
      )}
    </div>
  );
}
