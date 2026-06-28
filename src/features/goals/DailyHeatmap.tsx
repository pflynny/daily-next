"use client";

import { cn } from "@/lib/utils/cn";
import { toDateKey, todayKey, yearDates } from "@/lib/utils/date";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface DailyHeatmapProps {
  year: number;
  counts: Map<string, number>;
  onToggleDay?: (dateKey: string) => void;
  mode?: "binary" | "intensity";
  max?: number;
}

function intensityClass(value: number, max: number): string {
  if (value <= 0) return "bg-sand";
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) return "bg-brand-700";
  if (ratio >= 0.5) return "bg-brand-600";
  if (ratio >= 0.25) return "bg-brand-500";
  return "bg-brand-300";
}

export function DailyHeatmap({
  year,
  counts,
  onToggleDay,
  mode = "binary",
  max = 1,
}: DailyHeatmapProps) {
  const dates = yearDates(year);
  const leading = dates[0]?.getDay() ?? 0;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...dates,
  ];
  const today = todayKey();

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] pr-0.5 pt-px text-[9px] text-faint">
          {DAY_LETTERS.map((l, i) => (
            <span key={i} className="h-[12px] leading-[12px]">
              {i % 2 === 1 ? l : ""}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 auto-cols-[12px] gap-[3px]">
          {cells.map((date, i) => {
            if (!date) return <span key={`b${i}`} className="size-3" />;
            const key = toDateKey(date);
            const value = counts.get(key) ?? 0;
            const filled = value > 0;
            const isToday = key === today;
            const color =
              mode === "intensity"
                ? intensityClass(value, max)
                : filled
                  ? "bg-brand-500"
                  : "bg-sand hover:bg-brand-200";
            const cls = cn(
              "size-3 rounded-[3px] transition-colors",
              color,
              isToday && "ring-1 ring-ink/40",
            );
            return onToggleDay ? (
              <button
                key={key}
                onClick={() => onToggleDay(key)}
                title={`${date.toLocaleDateString()}${filled ? " · done" : ""}`}
                aria-label={`Toggle ${date.toLocaleDateString()}`}
                className={cls}
              />
            ) : (
              <span key={key} title={date.toLocaleDateString()} className={cls} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
