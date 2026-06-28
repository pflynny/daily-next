"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { buildListGroups } from "@/state/selectors";
import { newId } from "@/lib/utils/id";
import type { List, ListGroup, ListItem } from "@/types";

export function useLists() {
  const { listGroups, lists, listItems, put, del } = useAppData();

  const groups = useMemo(
    () => buildListGroups(listGroups, lists, listItems),
    [listGroups, lists, listItems],
  );

  // ---- groups --------------------------------------------------------------
  const addGroup = useCallback(
    (title: string): string | null => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      const id = newId();
      put("listGroups", [{ id, title: trimmed, position: listGroups.length }]);
      return id;
    },
    [listGroups.length, put],
  );

  const renameGroup = useCallback(
    (group: ListGroup, title: string) => {
      const trimmed = title.trim();
      if (trimmed) put("listGroups", [{ ...group, title: trimmed }]);
    },
    [put],
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      const childLists = lists.filter((l) => l.groupId === groupId);
      const childListIds = new Set(childLists.map((l) => l.id));
      const childItems = listItems.filter((i) => childListIds.has(i.listId));
      if (childItems.length) del("listItems", childItems.map((i) => i.id));
      if (childLists.length) del("lists", childLists.map((l) => l.id));
      del("listGroups", [groupId]);
    },
    [lists, listItems, del],
  );

  const moveGroup = useCallback(
    (groupId: string, dir: -1 | 1) => {
      const ordered = [...listGroups].sort((a, b) => a.position - b.position);
      const i = ordered.findIndex((g) => g.id === groupId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      put(
        "listGroups",
        ordered.map((g, idx) => ({ ...g, position: idx })),
      );
    },
    [listGroups, put],
  );

  // ---- lists ---------------------------------------------------------------
  const addList = useCallback(
    (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const count = lists.filter((l) => l.groupId === groupId).length;
      put("lists", [{ id: newId(), groupId, name: trimmed, position: count }]);
    },
    [lists, put],
  );

  const renameList = useCallback(
    (list: List, name: string) => {
      const trimmed = name.trim();
      if (trimmed) put("lists", [{ ...list, name: trimmed }]);
    },
    [put],
  );

  const deleteList = useCallback(
    (listId: string) => {
      const childItems = listItems.filter((i) => i.listId === listId);
      if (childItems.length) del("listItems", childItems.map((i) => i.id));
      del("lists", [listId]);
    },
    [listItems, del],
  );

  const moveList = useCallback(
    (groupId: string, listId: string, dir: -1 | 1) => {
      const ordered = lists
        .filter((l) => l.groupId === groupId)
        .sort((a, b) => a.position - b.position);
      const i = ordered.findIndex((l) => l.id === listId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      put(
        "lists",
        ordered.map((l, idx) => ({ ...l, position: idx })),
      );
    },
    [lists, put],
  );

  // ---- items ---------------------------------------------------------------
  const itemsOf = useCallback(
    (listId: string) =>
      listItems
        .filter((i) => i.listId === listId)
        .sort((a, b) => a.position - b.position),
    [listItems],
  );

  const addItem = useCallback(
    (listId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const count = itemsOf(listId).length;
      put("listItems", [
        {
          id: newId(),
          listId,
          text: trimmed,
          completed: false,
          notes: "",
          position: count,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [itemsOf, put],
  );

  const updateItem = useCallback(
    (item: ListItem, patch: Partial<ListItem>) => {
      put("listItems", [{ ...item, ...patch }]);
    },
    [put],
  );

  const toggleItem = useCallback(
    (item: ListItem) => {
      put("listItems", [{ ...item, completed: !item.completed }]);
    },
    [put],
  );

  const deleteItem = useCallback(
    (id: string) => {
      del("listItems", [id]);
    },
    [del],
  );

  const reorderItems = useCallback(
    (listId: string, ordered: ListItem[]) => {
      put(
        "listItems",
        ordered.map((it, i) => ({ ...it, listId, position: i })),
      );
    },
    [put],
  );

  const moveItem = useCallback(
    (itemId: string, toListId: string, beforeId: string | null) => {
      const item = listItems.find((i) => i.id === itemId);
      if (!item || item.listId === toListId) return;
      const target = itemsOf(toListId);
      const moved = { ...item, listId: toListId };
      const index = beforeId ? target.findIndex((t) => t.id === beforeId) : -1;
      const next = [...target];
      if (index >= 0) next.splice(index, 0, moved);
      else next.push(moved);
      put(
        "listItems",
        next.map((it, i) => ({ ...it, listId: toListId, position: i })),
      );
    },
    [listItems, itemsOf, put],
  );

  return {
    groups,
    addGroup,
    renameGroup,
    deleteGroup,
    moveGroup,
    addList,
    renameList,
    deleteList,
    moveList,
    itemsOf,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    reorderItems,
    moveItem,
  };
}
