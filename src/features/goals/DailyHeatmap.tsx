"use client";

import { cn } from "@/lib/utils/cn";
import { toDateKey, todayKey } from "@/lib/utils/date";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const today = todayKey();

  const monthGroups = Array.from({ length: 12 }, (_, m) => {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const days: Date[] = Array.from(
      { length: daysInMonth },
      (_, d) => new Date(year, m, d + 1),
    );
    const firstDay = days[0].getDay();
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstDay }, () => null),
      ...days,
    ];
    return { month: m, cells };
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-3">
        {monthGroups.map(({ month, cells }) => (
          <div key={month} className="flex flex-col gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wide text-faint">
              {MONTH_LABELS[month]}
            </span>
            <div className="grid grid-flow-col grid-rows-7 auto-cols-[10px] gap-[2px]">
              {cells.map((date, i) => {
                if (!date) return <span key={`b${month}-${i}`} className="size-[10px]" />;
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
                  "size-[10px] rounded-[2px] transition-colors",
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
        ))}
      </div>
    </div>
  );
}
