export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MONTHS_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** Local date key, YYYY-MM-DD (timezone-safe, unlike toISOString). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD key into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

export function addDaysKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function isToday(date: Date): boolean {
  return toDateKey(date) === todayKey();
}

export interface DayLabel {
  dayName: string;
  day: number;
  month: string;
  year: number;
}

export function dayLabel(date: Date): DayLabel {
  return {
    dayName: DAY_NAMES[date.getDay()],
    day: date.getDate(),
    month: MONTHS_SHORT[date.getMonth()],
    year: date.getFullYear(),
  };
}

export function dayLabelFromKey(key: string): DayLabel {
  return dayLabel(fromDateKey(key));
}

/** N consecutive days starting from `start`. */
export function consecutiveDays(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** All dates in a calendar year (local). */
export function yearDates(year: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date(year, 0, 1);
  while (cursor.getFullYear() === year) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Start-of-week date for the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Stable key for the week containing `date` (its start date key). */
export function weekKey(date: Date, weekStartsOn: 0 | 1 = 1): string {
  return toDateKey(startOfWeek(date, weekStartsOn));
}

export function startOfMonthKey(date: Date): string {
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** Inclusive day count between two date keys. */
export function daysBetween(fromKey: string, toKey: string): number {
  const a = fromDateKey(fromKey).getTime();
  const b = fromDateKey(toKey).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatLongDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
