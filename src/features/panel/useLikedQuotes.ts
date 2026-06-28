"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { quoteKey } from "@/lib/data/quotes";
import { newId } from "@/lib/utils/id";
import type { Quote } from "@/types";

export function useLikedQuotes() {
  const { likedQuotes, put, del } = useAppData();

  const keys = useMemo(
    () => new Set(likedQuotes.map((q) => quoteKey(q))),
    [likedQuotes],
  );

  const isLiked = useCallback((q: Quote) => keys.has(quoteKey(q)), [keys]);

  const toggleLike = useCallback(
    (q: Quote) => {
      const existing = likedQuotes.find((l) => quoteKey(l) === quoteKey(q));
      if (existing) del("likedQuotes", [existing.id]);
      else
        put("likedQuotes", [
          {
            id: newId(),
            text: q.text,
            author: q.author,
            createdAt: new Date().toISOString(),
          },
        ]);
    },
    [likedQuotes, put, del],
  );

  const remove = useCallback((id: string) => del("likedQuotes", [id]), [del]);

  return { likedQuotes, isLiked, toggleLike, remove };
}
