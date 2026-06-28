"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  ChevronLeft,
  ChevronRight,
  PhotoIcon,
  TrashIcon,
  XIcon,
} from "@/shared/ui/icons";
import { uploadMedia } from "@/lib/storage/upload";
import { CollectionItemRow } from "./CollectionItemRow";
import type { CollectionItem, CollectionView } from "@/types";

interface CollectionColumnProps {
  collection: CollectionView;
  sort: "added" | "rating";
  isFirst: boolean;
  isLast: boolean;
  onRename: (collection: CollectionView, name: string) => void;
  onDelete: (collection: CollectionView) => void;
  onMove: (collectionId: string, dir: -1 | 1) => void;
  onAddItem: (collectionId: string, title: string) => void;
  onOpenItem: (item: CollectionItem) => void;
  onSetBanner: (collection: CollectionView, url: string | null) => void;
}

export function CollectionColumn({
  collection,
  sort,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMove,
  onAddItem,
  onOpenItem,
  onSetBanner,
}: CollectionColumnProps) {
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(collection.name);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items =
    sort === "rating"
      ? [...collection.items].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      : collection.items;

  async function handleBannerFile(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const media = await uploadMedia(files[0]);
      onSetBanner(collection, media.url);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const actions = (
    <div
      className={cn(
        "flex items-center gap-0.5",
        collection.bannerUrl ? "text-white/90" : "text-faint",
      )}
    >
      <button
        onClick={() => fileRef.current?.click()}
        aria-label="Cover photo"
        disabled={uploading}
        className="rounded p-0.5 hover:opacity-70"
      >
        <PhotoIcon size={14} />
      </button>
      {collection.bannerUrl && (
        <button
          onClick={() => onSetBanner(collection, null)}
          aria-label="Remove cover"
          className="rounded p-0.5 hover:opacity-70"
        >
          <XIcon size={14} />
        </button>
      )}
      <button
        onClick={() => onMove(collection.id, -1)}
        disabled={isFirst}
        aria-label="Move left"
        className="rounded p-0.5 hover:opacity-70 disabled:opacity-30"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={() => onMove(collection.id, 1)}
        disabled={isLast}
        aria-label="Move right"
        className="rounded p-0.5 hover:opacity-70 disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
      <button
        onClick={() => onDelete(collection)}
        aria-label="Delete list"
        className="rounded p-0.5 hover:text-danger"
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );

  const nameButton = (light?: boolean) =>
    editingName ? (
      <input
        autoFocus
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => {
          setEditingName(false);
          onRename(collection, nameDraft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditingName(false);
            onRename(collection, nameDraft);
          }
        }}
        className={cn(
          "flex-1 bg-transparent text-sm font-bold uppercase tracking-wide outline-none",
          light ? "text-white" : "text-brand-700",
        )}
      />
    ) : (
      <button
        onClick={() => {
          setNameDraft(collection.name);
          setEditingName(true);
        }}
        className={cn(
          "flex-1 truncate text-left text-sm font-bold uppercase tracking-wide",
          light ? "text-white" : "text-brand-700",
        )}
      >
        {collection.name}{" "}
        <span className={light ? "text-white/70" : "text-faint"}>
          {collection.items.length}
        </span>
      </button>
    );

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface md:w-[280px]">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleBannerFile(e.target.files)}
        className="hidden"
      />

      {collection.bannerUrl ? (
        <div className="group/head relative h-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collection.bannerUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
          <div className="absolute right-1.5 top-1.5">{actions}</div>
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-1.5 p-2.5">
            {nameButton(true)}
          </div>
        </div>
      ) : (
        <div className="group/head flex items-center gap-1.5 border-b border-line px-3 pb-2 pt-3">
          {nameButton(false)}
          {actions}
        </div>
      )}

      <div className="px-3 pb-2 pt-1">
        {collection.items.length === 0 && (
          <p className="px-1 py-3 text-xs text-faint">
            {uploading ? "Uploading cover…" : "Nothing here yet."}
          </p>
        )}
        {items.map((item) => (
          <CollectionItemRow key={item.id} item={item} onClick={onOpenItem} />
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAddItem(collection.id, draft);
              setDraft("");
            }
          }}
          placeholder="Add a title…"
          className="mt-1 w-full bg-transparent px-1 py-2 text-sm text-ink placeholder:text-faint/70 outline-none"
        />
      </div>
    </div>
  );
}
