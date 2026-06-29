"use client";

import { cn } from "@/lib/utils/cn";
import { toDateKey, todayKey } from "@/lib/utils/date";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// One signature color per month from the seasonal palette cards
const MONTH_COLOR = [
  "#2A3F5E", // Jan  Indigo Blue    — deep winter navy
  "#7F171F", // Feb  Merlot         — valentine red
  "#455947", // Mar  Woodlands      — first forest green
  "#498B60", // Apr  Viridian       — spring mid-green
  "#F06842", // May  Marigold       — bold spring warmth
  "#FEDC78", // Jun  Honeysuckle    — long golden days
  "#027A76", // Jul  Deep Dive      — summer teal depths
  "#BD5224", // Aug  Terra Cotta    — earthy summer heat
  "#DA993C", // Sep  Harvest Gold   — golden turn
  "#BF5030", // Oct  Pumpkin Spice  — classic autumn
  "#38524C", // Nov  Evergreen      — deep late forest
  "#042D29", // Dec  Midnight       — darkest winter
];

// Mix a hex color with white — 0 = original, 1 = white
function tint(hex: string, amount = 0.28): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

const CELL = 10;
const GAP = 2;
const STRIDE = CELL + GAP;

interface DailyHeatmapProps {
  year: number;
  counts: Map<string, number>;
  onToggleDay?: (dateKey: string) => void;
  mode?: "binary" | "intensity";
  max?: number;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function DailyHeatmap({ year, counts, onToggleDay, mode = "binary", max = 1 }: DailyHeatmapProps) {
  const today = todayKey();

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startDow = jan1.getDay();
  const endDow = dec31.getDay();

  // Grid bounds: Sunday on/before Jan 1 → Saturday on/after Dec 31
  const gridStart = addDays(jan1, -startDow);
  const lastWeekStart = addDays(dec31, -endDow);
  const totalCols = Math.round((lastWeekStart.getTime() - gridStart.getTime()) / (7 * 86400000)) + 1;

  function colOf(d: Date): number {
    return Math.floor((d.getTime() - gridStart.getTime()) / (7 * 86400000));
  }

  // All cells in column-major order (col 0 dow 0-6, col 1 dow 0-6, …)
  const cells: { date: Date | null; month: number }[] = [];
  for (let col = 0; col < totalCols; col++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = addDays(gridStart, col * 7 + dow);
      cells.push(d.getFullYear() === year ? { date: d, month: d.getMonth() } : { date: null, month: -1 });
    }
  }

  // Month label widths — each month occupies from its 1st to the next month's 1st
  const monthSpans = Array.from({ length: 12 }, (_, m) => {
    const sc = colOf(new Date(year, m, 1));
    const ec = m < 11 ? colOf(new Date(year, m + 1, 1)) : totalCols;
    return { label: MONTH_LABELS[m], width: (ec - sc) * STRIDE };
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col" style={{ gap: 4 }}>
        {/* Month labels row — no gaps, spans mirror the grid columns */}
        <div className="flex">
          {monthSpans.map(({ label, width }, m) => (
            <span
              key={m}
              style={{ width, minWidth: 0 }}
              className="overflow-hidden truncate text-[9px] font-medium uppercase tracking-wide text-faint"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Continuous year grid */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            gridAutoFlow: "column",
            gridAutoColumns: CELL,
            gap: GAP,
          }}
        >
          {cells.map((cell, i) => {
            if (!cell.date) {
              return <span key={i} style={{ width: CELL, height: CELL }} />;
            }

            const key = toDateKey(cell.date);
            const value = counts.get(key) ?? 0;
            const filled = value > 0;
            const isToday = key === today;
            const monthColor = MONTH_COLOR[cell.month];

            let bgColor: string | undefined;
            if (filled) {
              if (mode === "intensity") {
                const ratio = max > 0 ? value / max : 0;
                const extra = ratio >= 0.75 ? 0 : ratio >= 0.5 ? 0.12 : ratio >= 0.25 ? 0.24 : 0.4;
                bgColor = tint(monthColor, 0.28 + extra);
              } else {
                bgColor = tint(monthColor);
              }
            }

            const style: React.CSSProperties = {
              width: CELL,
              height: CELL,
              borderRadius: 2,
              ...(bgColor ? { backgroundColor: bgColor } : {}),
              ...(isToday ? { outline: "1px solid rgba(0,0,0,0.35)", outlineOffset: "-1px" } : {}),
            };

            return onToggleDay ? (
              <button
                key={key}
                onClick={() => onToggleDay(key)}
                title={`${cell.date.toLocaleDateString()}${filled ? " · done" : ""}`}
                aria-label={`Toggle ${cell.date.toLocaleDateString()}`}
                style={style}
                className={cn("transition-opacity hover:opacity-75", !filled && "bg-sand")}
              />
            ) : (
              <span
                key={key}
                title={cell.date.toLocaleDateString()}
                style={style}
                className={cn(!filled && "bg-sand")}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
