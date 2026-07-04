"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { newId } from "@/lib/utils/id";
import type { CheckIn, CheckInKind } from "@/types";

export function useCheckIns() {
  const { checkIns, put, del } = useAppData();

  const forDate = useCallback(
    (date: string, kind: CheckInKind): CheckIn | null =>
      checkIns.find((c) => c.date === date && c.kind === kind) ?? null,
    [checkIns],
  );

  /** Days with at least one check-in, newest first. */
  const history = useMemo(() => {
    const byDate = new Map<string, { morning?: CheckIn; evening?: CheckIn }>();
    for (const c of checkIns) {
      const entry = byDate.get(c.date) ?? {};
      entry[c.kind] = c;
      byDate.set(c.date, entry);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [checkIns]);

  const save = useCallback(
    (
      date: string,
      kind: CheckInKind,
      patch: Partial<Pick<CheckIn, "feelings" | "gratitude" | "note">>,
      existing: CheckIn | null,
    ) => {
      const base: CheckIn = existing ?? {
        id: newId(),
        date,
        kind,
        feelings: [],
        gratitude: [],
        note: "",
        createdAt: new Date().toISOString(),
      };
      put("checkIns", [{ ...base, ...patch }]);
    },
    [put],
  );

  const deleteCheckIn = useCallback(
    (id: string) => {
      const existing = checkIns.find((c) => c.id === id);
      del("checkIns", [id]);
      return () => {
        if (existing) put("checkIns", [existing]);
      };
    },
    [checkIns, del, put],
  );

  return { checkIns, forDate, history, save, deleteCheckIn };
}
