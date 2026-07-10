import { newId } from "@/lib/utils/id";
import type { FitnessYear, GarminYearSummary, PeaksYearSummary } from "@/types";

/**
 * Parsers for the two fitness files Settings → Integrations accepts:
 * Personal Record's daily-fitness.json (Garmin) and a cairnbook backup.
 * Each merges into the per-year fitnessYears rows, leaving the other
 * app's section untouched.
 */

function rowForYear(existing: FitnessYear[], year: number): FitnessYear {
  return (
    existing.find((f) => f.year === year) ?? {
      id: newId(),
      year,
      garmin: null,
      peaks: null,
      updatedAt: "",
    }
  );
}

/** Personal Record's export: { app: "personal-record", kind: "daily-fitness", years: {...} } */
export function parseGarminFitness(
  parsed: unknown,
  existing: FitnessYear[],
): FitnessYear[] | null {
  const file = parsed as {
    kind?: string;
    years?: Record<string, GarminYearSummary>;
  };
  if (file?.kind !== "daily-fitness" || !file.years) return null;

  const now = new Date().toISOString();
  const rows: FitnessYear[] = [];
  for (const [key, summary] of Object.entries(file.years)) {
    const year = Number(key);
    if (!Number.isInteger(year) || !summary) continue;
    rows.push({ ...rowForYear(existing, year), garmin: summary, updatedAt: now });
  }
  return rows.length ? rows : null;
}

/** A cairnbook backup: { app: "cairnbook", ticks: [{ list, date, ... }] } */
export function parseCairnbookBackup(
  parsed: unknown,
  existing: FitnessYear[],
): FitnessYear[] | null {
  const file = parsed as {
    app?: string;
    ticks?: { list?: string; date?: string | null }[];
  };
  if (file?.app !== "cairnbook" || !Array.isArray(file.ticks)) return null;

  // year -> list slug -> count (undated ticks can't be placed in a year)
  const byYear = new Map<number, Record<string, number>>();
  for (const tick of file.ticks) {
    const year = Number(tick.date?.slice(0, 4));
    if (!Number.isInteger(year) || !tick.list) continue;
    const lists = byYear.get(year) ?? {};
    lists[tick.list] = (lists[tick.list] ?? 0) + 1;
    byYear.set(year, lists);
  }

  const now = new Date().toISOString();
  const rows: FitnessYear[] = [];
  for (const [year, byList] of byYear) {
    const peaks: PeaksYearSummary = {
      total: Object.values(byList).reduce((s, n) => s + n, 0),
      byList,
    };
    rows.push({ ...rowForYear(existing, year), peaks, updatedAt: now });
  }
  return rows.length ? rows : null;
}
