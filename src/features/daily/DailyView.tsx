"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils/cn";
import {
  addDays,
  consecutiveDays,
  dayLabelFromKey,
  toDateKey,
  todayKey,
} from "@/lib/utils/date";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ListIcon,
  QuoteIcon,
  SearchIcon,
  TodayIcon,
} from "@/shared/ui/icons";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { useAppData } from "@/state/AppDataProvider";
import { Sheet } from "@/shared/ui/Sheet";
import { useToast } from "@/shared/ui/ToastProvider";
import { OPEN_SEARCH_EVENT } from "@/features/search/CommandPalette";
import { ListsPanel } from "@/features/lists/ListsPanel";
import { QuotePanel } from "@/features/panel/QuotePanel";
import { CheckInPrompt } from "@/features/checkins/CheckInPrompt";
import { ActiveDragChip } from "@/shared/components/ActiveDragChip";
import { useTasks } from "./useTasks";
import { DayColumn } from "./DayColumn";
import { TaskDetailSheet } from "./TaskDetailSheet";
import type { Task } from "@/types";

const SWIPE_THRESHOLD = 48;

/** Drop on whatever is under the pointer; closest-center let nearby task
 *  rows out-compete adjacent day columns, making short moves impossible. */
const pointerFirstCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
};

export function DailyView() {
  const isDesktop = useIsDesktop();
  const {
    getDay,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
    reorderIncomplete,
    moveTask,
  } = useTasks();

  const [windowStart, setWindowStart] = useState(() => new Date());
  const [currentDay, setCurrentDay] = useState(() => new Date());
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [listsSheet, setListsSheet] = useState(false);
  // Desktop column count — a per-device display preference.
  const [dayCount, setDayCount] = useState<1 | 3 | 5>(5);
  useEffect(() => {
    const saved = window.localStorage.getItem("daily-day-count");
    if (saved === "1" || saved === "3" || saved === "5") {
      setDayCount(Number(saved) as 1 | 3 | 5);
    }
  }, []);
  function changeDayCount(n: 1 | 3 | 5) {
    setDayCount(n);
    window.localStorage.setItem("daily-day-count", String(n));
  }
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const { settings, setSettings } = useAppData();
  const toast = useToast();
  const showLists = settings.showLists;
  const showPanel = settings.showPanel;

  const handleDeleteTask = (t: Task) => {
    const restore = deleteTask(t.id);
    toast.undo("Task deleted", restore);
  };
  const toggleLists = () =>
    isDesktop ? setSettings({ showLists: !showLists }) : setListsSheet(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const desktopKeys = useMemo(
    () => consecutiveDays(windowStart, dayCount).map(toDateKey),
    [windowStart, dayCount],
  );
  const mobileKey = toDateKey(currentDay);
  const mobileLabel = dayLabelFromKey(mobileKey);
  const onToday = toDateKey(windowStart) === todayKey();

  function goToday() {
    const now = new Date();
    setWindowStart(now);
    setCurrentDay(now);
  }

  function handleDragEnd(e: DragEndEvent) {
    if (e.active.data.current?.type !== "task") return; // list items handled in ListsPanel
    const { active, over } = e;
    if (!over) return;
    const activeDate = active.data.current?.date as string | undefined;
    const overDate = over.data.current?.date as string | undefined;
    if (!activeDate || !overDate) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeDate === overDate) {
      const { incomplete } = getDay(activeDate);
      const oldIndex = incomplete.findIndex((t) => t.id === activeId);
      let newIndex = incomplete.findIndex((t) => t.id === overId);
      if (newIndex === -1) newIndex = incomplete.length - 1;
      if (oldIndex === -1 || oldIndex === newIndex) return;
      reorderIncomplete(activeDate, arrayMove(incomplete, oldIndex, newIndex));
    } else {
      const overIsTask = over.data.current?.type === "task";
      moveTask(activeId, overDate, overIsTask ? overId : null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <h1 className="font-mono text-lg font-bold tracking-tight text-ink">
          DAILY
        </h1>

        {isDesktop ? (
          <div className="flex flex-1 items-center gap-1">
            <div className="flex items-center rounded-lg border border-line p-0.5 text-[11px] font-semibold">
              {([1, 3, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => changeDayCount(n)}
                  aria-label={`Show ${n} day${n > 1 ? "s" : ""}`}
                  className={cn(
                    "rounded-md px-2 py-1",
                    dayCount === n
                      ? "bg-brand-700 text-white"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
              aria-label="Search"
              className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink"
            >
              <SearchIcon size={18} />
            </button>

            <div className="ml-auto flex items-center gap-1">
              {!onToday && (
                <button
                  onClick={goToday}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:bg-sand hover:text-ink"
                >
                  <TodayIcon size={16} /> Today
                </button>
              )}
              <NavButton
                label={`Back ${dayCount} day${dayCount > 1 ? "s" : ""}`}
                onClick={() => setWindowStart((d) => addDays(d, -dayCount))}
              >
                <ChevronsLeft size={18} />
              </NavButton>
              <NavButton label="Previous day" onClick={() => setWindowStart((d) => addDays(d, -1))}>
                <ChevronLeft size={18} />
              </NavButton>
              <NavButton label="Next day" onClick={() => setWindowStart((d) => addDays(d, 1))}>
                <ChevronRight size={18} />
              </NavButton>
              <NavButton
                label={`Forward ${dayCount} day${dayCount > 1 ? "s" : ""}`}
                onClick={() => setWindowStart((d) => addDays(d, dayCount))}
              >
                <ChevronsRight size={18} />
              </NavButton>
              {/* Calendar icon; the invisible input on top opens the native picker */}
              <div className="relative rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink">
                <CalendarIcon size={18} />
                <input
                  type="date"
                  value={toDateKey(windowStart)}
                  onChange={(e) =>
                    e.target.value &&
                    setWindowStart(new Date(`${e.target.value}T00:00:00`))
                  }
                  aria-label="Jump to date"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              <button
                onClick={toggleLists}
                className={cn(
                  "ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-sand hover:text-ink",
                  showLists ? "text-brand-700" : "text-muted",
                )}
              >
                <ListIcon size={15} /> Lists
                <ChevronDown
                  size={13}
                  className={cn("transition-transform", !showLists && "rotate-180")}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-end gap-1">
            <button
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
              aria-label="Search"
              className="mr-auto rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink"
            >
              <SearchIcon size={18} />
            </button>
            <NavButton label="Previous day" onClick={() => setCurrentDay((d) => addDays(d, -1))}>
              <ChevronLeft size={20} />
            </NavButton>
            <div className="min-w-0 text-center">
              <div className="text-[11px] uppercase tracking-wide text-brand-500/80">
                {mobileLabel.day} {mobileLabel.month}
              </div>
              <div className="text-sm font-bold uppercase leading-none text-brand-700">
                {mobileLabel.dayName}
              </div>
            </div>
            <NavButton label="Next day" onClick={() => setCurrentDay((d) => addDays(d, 1))}>
              <ChevronRight size={20} />
            </NavButton>
            {mobileKey !== todayKey() && (
              <button
                onClick={goToday}
                aria-label="Today"
                className="ml-1 rounded-lg p-1.5 text-muted hover:bg-sand"
              >
                <TodayIcon size={18} />
              </button>
            )}
            <button
              onClick={() => setListsSheet(true)}
              aria-label="Open lists"
              className="rounded-lg p-1.5 text-muted hover:bg-sand"
            >
              <ListIcon size={18} />
            </button>
          </div>
        )}
      </header>

      <CheckInPrompt />

      {/* Days */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerFirstCollision}
        onDragEnd={handleDragEnd}
      >
        {isDesktop ? (
          <div
            className={cn(
              "grid min-h-0 flex-1",
              dayCount === 5 && "grid-cols-5",
              dayCount === 3 && "grid-cols-3",
              dayCount === 1 && "mx-auto w-full max-w-3xl grid-cols-1",
            )}
          >
            {desktopKeys.map((key) => {
              const { incomplete, completed } = getDay(key);
              return (
                <DayColumn
                  key={key}
                  dateKey={key}
                  incomplete={incomplete}
                  completed={completed}
                  onAdd={addTask}
                  onToggle={toggleTask}
                  onUpdateText={(t, text) => updateTask(t, { text })}
                  onOpenDetail={setDetailTask}
                  onDelete={handleDeleteTask}
                />
              );
            })}
          </div>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col"
            onTouchStart={(e) => {
              touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              if (!start) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
                setCurrentDay((d) => addDays(d, dx < 0 ? 1 : -1));
              }
              touchStart.current = null;
            }}
          >
            <div key={mobileKey} className="flex min-h-0 flex-1 animate-fade-rise flex-col">
              {(() => {
                const { incomplete, completed } = getDay(mobileKey);
                return (
                  <DayColumn
                    dateKey={mobileKey}
                    incomplete={incomplete}
                    completed={completed}
                    onAdd={addTask}
                    onToggle={toggleTask}
                    onUpdateText={(t, text) => updateTask(t, { text })}
                    onOpenDetail={setDetailTask}
                    onDelete={handleDeleteTask}
                  />
                );
              })()}
            </div>
          </div>
        )}

        <DragOverlay>
          <ActiveDragChip kind="task" className="text-sm" />
        </DragOverlay>

        {/* Lists panel — collapsible on desktop, a sheet on mobile.
            Inside the DndContext so list items can be dragged onto days. */}
        {isDesktop && showLists && (
          <section className="thin-scrollbar max-h-[42vh] flex-none overflow-y-auto border-t border-line bg-sand/40">
            <ListsPanel />
          </section>
        )}

        {!isDesktop && (
          <Sheet
            open={listsSheet}
            onClose={() => setListsSheet(false)}
            title="Lists"
            size="lg"
          >
            <div className="-mx-5">
              <ListsPanel />
            </div>
          </Sheet>
        )}
      </DndContext>

      {/* Quote + BTC panel */}
      {showPanel ? (
        <div className="flex-none">
          <QuotePanel onCollapse={() => setSettings({ showPanel: false })} />
        </div>
      ) : (
        <button
          onClick={() => setSettings({ showPanel: true })}
          className="flex flex-none items-center justify-center gap-1.5 border-t border-line bg-paper py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint hover:text-ink"
        >
          <QuoteIcon size={13} /> Quote &amp; price
        </button>
      )}

      <TaskDetailSheet
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={(t, patch) => {
          updateTask(t, patch);
          setDetailTask((cur) => (cur ? { ...cur, ...patch } : cur));
        }}
        onMoveDate={(t, toKey) => updateTask(t, { date: toKey })}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sand hover:text-ink"
    >
      {children}
    </button>
  );
}
