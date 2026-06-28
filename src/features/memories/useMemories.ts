"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { buildMemories } from "@/state/selectors";
import { newId } from "@/lib/utils/id";
import type { Memory, MemoryType, MemoryView } from "@/types";
import type { UploadedMedia } from "@/lib/storage/upload";

export interface NewMemoryInput {
  occurredOn: string;
  type: MemoryType;
  title: string;
  body: string;
  quoteAuthor: string;
  linkUrl: string;
  media: UploadedMedia[];
}

export function useMemories() {
  const { memories, memoryMedia, put, del } = useAppData();

  const timeline = useMemo(
    () => buildMemories(memories, memoryMedia),
    [memories, memoryMedia],
  );

  const byYear = useMemo(() => {
    const groups = new Map<number, MemoryView[]>();
    for (const m of timeline) {
      const year = Number(m.occurredOn.slice(0, 4)) || new Date().getFullYear();
      const arr = groups.get(year);
      if (arr) arr.push(m);
      else groups.set(year, [m]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [timeline]);

  const addMemory = useCallback(
    (input: NewMemoryInput) => {
      const id = newId();
      const now = new Date().toISOString();
      put("memories", [
        {
          id,
          occurredOn: input.occurredOn,
          type: input.type,
          title: input.title.trim(),
          body: input.body.trim(),
          quoteAuthor: input.quoteAuthor.trim(),
          linkUrl: input.linkUrl.trim(),
          position: 0,
          createdAt: now,
        },
      ]);
      if (input.media.length) {
        put(
          "memoryMedia",
          input.media.map((m, i) => ({
            id: newId(),
            memoryId: id,
            kind: m.kind,
            url: m.url,
            key: m.key,
            width: m.width,
            height: m.height,
            mime: m.mime,
            size: m.size,
            position: i,
          })),
        );
      }
    },
    [put],
  );

  const updateMemory = useCallback(
    (memory: Memory, patch: Partial<Memory>) =>
      put("memories", [{ ...memory, ...patch }]),
    [put],
  );

  const deleteMemory = useCallback(
    (memoryId: string) => {
      const mediaIds = memoryMedia
        .filter((m) => m.memoryId === memoryId)
        .map((m) => m.id);
      if (mediaIds.length) del("memoryMedia", mediaIds);
      del("memories", [memoryId]);
    },
    [memoryMedia, del],
  );

  return { timeline, byYear, addMemory, updateMemory, deleteMemory };
}
