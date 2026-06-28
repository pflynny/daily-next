"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { buildCollections } from "@/state/selectors";
import { newId } from "@/lib/utils/id";
import type {
  Collection,
  CollectionItem,
  CollectionMediaType,
} from "@/types";

export function useCollections() {
  const { collections, collectionItems, put, del } = useAppData();

  const years = useMemo(() => {
    const set = new Set<number>(collections.map((c) => c.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [collections]);

  const forYear = useCallback(
    (year: number) => buildCollections(collections, collectionItems, year),
    [collections, collectionItems],
  );

  const addCollection = useCallback(
    (year: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const count = collections.filter((c) => c.year === year).length;
      put("collections", [
        { id: newId(), year, name: trimmed, position: count },
      ]);
    },
    [collections, put],
  );

  const renameCollection = useCallback(
    (collection: Collection, name: string) => {
      const trimmed = name.trim();
      if (trimmed) put("collections", [{ ...collection, name: trimmed }]);
    },
    [put],
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      const itemIds = collectionItems
        .filter((i) => i.collectionId === collectionId)
        .map((i) => i.id);
      if (itemIds.length) del("collectionItems", itemIds);
      del("collections", [collectionId]);
    },
    [collectionItems, del],
  );

  const moveCollection = useCallback(
    (year: number, collectionId: string, dir: -1 | 1) => {
      const ordered = collections
        .filter((c) => c.year === year)
        .sort((a, b) => a.position - b.position);
      const i = ordered.findIndex((c) => c.id === collectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      put("collections", ordered.map((c, idx) => ({ ...c, position: idx })));
    },
    [collections, put],
  );

  const addItem = useCallback(
    (collectionId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const count = collectionItems.filter(
        (i) => i.collectionId === collectionId,
      ).length;
      put("collectionItems", [
        {
          id: newId(),
          collectionId,
          title: trimmed,
          creator: "",
          rating: null,
          review: "",
          mediaType: "other" as CollectionMediaType,
          coverUrl: null,
          position: count,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [collectionItems, put],
  );

  const updateItem = useCallback(
    (item: CollectionItem, patch: Partial<CollectionItem>) =>
      put("collectionItems", [{ ...item, ...patch }]),
    [put],
  );

  const deleteItem = useCallback(
    (id: string) => del("collectionItems", [id]),
    [del],
  );

  return {
    years,
    forYear,
    addCollection,
    renameCollection,
    deleteCollection,
    moveCollection,
    addItem,
    updateItem,
    deleteItem,
  };
}
