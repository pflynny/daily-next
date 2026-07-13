"use client";

import { useDndContext } from "@dnd-kit/core";
import { cn } from "@/lib/utils/cn";
import { useAppData } from "@/state/AppDataProvider";

/**
 * DragOverlay content derived from dnd-kit's own active state, so the chip
 * can never outlive the drag (tracking it in component state desynced when
 * a fast drag delivered onDragStart after onDragEnd).
 */
export function ActiveDragChip({
  kind,
  className,
}: {
  kind: "task" | "listItem";
  className?: string;
}) {
  const { active } = useDndContext();
  const { tasks, listItems } = useAppData();
  const type = (active?.data.current as { type?: string } | undefined)?.type;
  if (!active || type !== kind) return null;
  const id = String(active.id);
  const text =
    kind === "task"
      ? tasks.find((t) => t.id === id)?.text
      : listItems.find((i) => i.id === id)?.text;
  if (!text) return null;
  return (
    <div
      className={cn(
        "pointer-events-none rounded-lg border border-brand-200 bg-surface px-3 py-1.5 text-ink shadow-lg",
        className,
      )}
    >
      {text}
    </div>
  );
}
