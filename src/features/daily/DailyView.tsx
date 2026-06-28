"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ListIcon,
  TodayIcon,
} from "@/shared/ui/icons";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { useAppData } from "@/state/AppDataProvider";
import { Sheet } from "@/shared/ui/Sheet";
import { ListsPanel } from "@/features/lists/ListsPanel";
import { useTasks } from "./useTasks";
import { DayColumn } from "./DayColumn";
import { TaskDetailSheet } from "./TaskDetailSheet";
import type { Task } from "@/types";

const SWIPE_THRESHOLD = 48;

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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [listsSheet, setListsSheet] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const { settings, setSettings } = useAppData();
  const showLists = settings.showLists;
  const toggleLists = () =>
    isDesktop ? setSettings({ showLists: !showLists }) : setListsSheet(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const desktopKeys = useMemo(
    () => consecutiveDays(windowStart, 5).map(toDateKey),
    [windowStart],
  );
  const mobileKey = toDateKey(currentDay);
  const mobileLabel = dayLabelFromKey(mobileKey);

  function goToday() {
    const now = new Date();
    setWindowStart(now);
    setCurrentDay(now);
  }

  function handleDragStart(e: DragStartEvent) {
    const date = e.active.data.current?.date as string | undefined;
    if (!date) return;
    const found = getDay(date).all.find((t) => t.id === String(e.active.id));
    setActiveTask(found ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
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
            <NavButton label="Back 5 days" onClick={() => setWindowStart((d) => addDays(d, -5))}>
              <ChevronsLeft size={18} />
            </NavButton>
            <NavButton label="Previous day" onClick={() => setWindowStart((d) => addDays(d, -1))}>
              <ChevronLeft size={18} />
            </NavButton>
            <NavButton label="Next day" onClick={() => setWindowStart((d) => addDays(d, 1))}>
              <ChevronRight size={18} />
            </NavButton>
            <NavButton label="Forward 5 days" onClick={() => setWindowStart((d) => addDays(d, 5))}>
              <ChevronsRight size={18} />
            </NavButton>
            <button
              onClick={goToday}
              className="ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:bg-sand hover:text-ink"
            >
              <TodayIcon size={16} /> Today
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={toggleLists}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-sand hover:text-ink",
                  showLists ? "text-brand-700" : "text-muted",
                )}
              >
                <ListIcon size={15} /> Lists
                <ChevronDown
                  size={13}
                  className={cn("transition-transform", !showLists && "rotate-180")}
                />
              </button>
              <input
                type="date"
                value={toDateKey(windowStart)}
                onChange={(e) =>
                  e.target.value &&
                  setWindowStart(new Date(`${e.target.value}T00:00:00`))
                }
                className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-muted outline-none focus:border-brand-400"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-end gap-1">
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
            <button
              onClick={goToday}
              aria-label="Today"
              className={cn(
                "ml-1 rounded-lg p-1.5 hover:bg-sand",
                mobileKey === todayKey() ? "text-brand-600" : "text-muted",
              )}
            >
              <TodayIcon size={18} />
            </button>
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

      {/* Days */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isDesktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-5">
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
                  />
                );
              })()}
            </div>
          </div>
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-lg border border-brand-200 bg-surface px-3 py-1.5 text-sm text-ink shadow-lg">
              {activeTask.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lists panel — collapsible on desktop, a sheet on mobile */}
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

      <TaskDetailSheet
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={(t, patch) => {
          updateTask(t, patch);
          setDetailTask((cur) => (cur ? { ...cur, ...patch } : cur));
        }}
        onMoveDate={(t, toKey) => updateTask(t, { date: toKey })}
        onDelete={(t) => deleteTask(t.id)}
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
