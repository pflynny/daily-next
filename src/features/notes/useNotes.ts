"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { newId } from "@/lib/utils/id";
import type { Note } from "@/types";

export function useNotes() {
  const { notes, put, del } = useAppData();

  const all = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  const addNote = useCallback((): string => {
    const now = new Date().toISOString();
    const id = newId();
    put("notes", [{ id, title: "", body: "", createdAt: now, updatedAt: now }]);
    return id;
  }, [put]);

  const updateNote = useCallback(
    (note: Note, patch: Partial<Pick<Note, "title" | "body">>) =>
      put("notes", [{ ...note, ...patch, updatedAt: new Date().toISOString() }]),
    [put],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const existing = notes.find((n) => n.id === id);
      del("notes", [id]);
      return () => {
        if (existing) put("notes", [existing]);
      };
    },
    [notes, del, put],
  );

  return { all, addNote, updateNote, deleteNote };
}
