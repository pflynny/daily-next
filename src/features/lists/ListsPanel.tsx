"use client";

import { useEffect, useMemo, useState } from "react";
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
import { todayKey } from "@/lib/utils/date";
import { Sheet } from "@/shared/ui/Sheet";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/ToastProvider";
import { ChevronLeft, ChevronRight, PlusIcon, TrashIcon, XIcon } from "@/shared/ui/icons";
import { useTasks } from "@/features/daily/useTasks";
import { useLists } from "./useLists";
import { ListColumn } from "./ListColumn";
import type { ListItem } from "@/types";

export function ListsPanel() {
  const lists = useLists();
  const { addTask } = useTasks();
  const toast = useToast();
  const { groups } = lists;

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [newTab, setNewTab] = useState("");
  const [newList, setNewList] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabDraft, setTabDraft] = useState("");
  const [detailItem, setDetailItem] = useState<ListItem | null>(null);
  const [activeItem, setActiveItem] = useState<ListItem | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "group"; id: string; label: string }
    | { kind: "list"; id: string; label: string }
    | null
  >(null);

  useEffect(() => {
    if (!activeGroupId && groups.length) setActiveGroupId(groups[0].id);
    else if (activeGroupId && !groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0]?.id ?? null);
    }
  }, [groups, activeGroupId]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null,
    [groups, activeGroupId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findItem(id: string): ListItem | null {
    for (const list of activeGroup?.lists ?? []) {
      const item = list.items.find((i) => i.id === id);
      if (item) return item;
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveItem(findItem(String(e.active.id)));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = e;
    if (!over || !activeGroup) return;
    const fromListId = active.data.current?.listId as string | undefined;
    const toListId = over.data.current?.listId as string | undefined;
    if (!fromListId || !toListId) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (fromListId === toListId) {
      const list = activeGroup.lists.find((l) => l.id === fromListId);
      if (!list) return;
      const incomplete = list.items.filter((i) => !i.completed);
      const oldIndex = incomplete.findIndex((i) => i.id === activeId);
      let newIndex = incomplete.findIndex((i) => i.id === overId);
      if (newIndex === -1) newIndex = incomplete.length - 1;
      if (oldIndex === -1 || oldIndex === newIndex) return;
      lists.reorderItems(fromListId, arrayMove(incomplete, oldIndex, newIndex));
    } else {
      const overIsItem = over.data.current?.type === "listItem";
      lists.moveItem(activeId, toListId, overIsItem ? overId : null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 pt-3">
        {groups.map((group) => {
          const active = group.id === activeGroup?.id;
          return (
            <div
              key={group.id}
              className={cn(
                "group/tab flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1",
                active
                  ? "border-brand-500 text-ink"
                  : "border-line text-muted hover:text-ink",
              )}
            >
              {editingTabId === group.id ? (
                <input
                  autoFocus
                  value={tabDraft}
                  onChange={(e) => setTabDraft(e.target.value)}
                  onBlur={() => {
                    lists.renameGroup(group, tabDraft);
                    setEditingTabId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      lists.renameGroup(group, tabDraft);
                      setEditingTabId(null);
                    }
                  }}
                  className="w-24 bg-transparent text-xs font-semibold uppercase outline-none"
                />
              ) : (
                <button
                  onClick={() => setActiveGroupId(group.id)}
                  onDoubleClick={() => {
                    setTabDraft(group.title);
                    setEditingTabId(group.id);
                  }}
                  className="text-xs font-semibold uppercase tracking-wide"
                >
                  {group.title}
                </button>
              )}
              <button
                onClick={() => lists.moveGroup(group.id, -1)}
                aria-label="Move tab left"
                className="text-faint hover:text-ink"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => lists.moveGroup(group.id, 1)}
                aria-label="Move tab right"
                className="text-faint hover:text-ink"
              >
                <ChevronRight size={12} />
              </button>
              <button
                onClick={() =>
                  setConfirm({ kind: "group", id: group.id, label: group.title })
                }
                aria-label="Delete tab"
                className="text-faint hover:text-danger"
              >
                <XIcon size={12} />
              </button>
            </div>
          );
        })}
        <input
          value={newTab}
          onChange={(e) => setNewTab(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTab.trim()) {
              const id = lists.addGroup(newTab);
              if (id) setActiveGroupId(id);
              setNewTab("");
            }
          }}
          placeholder="+ Tab"
          className="w-20 shrink-0 bg-transparent px-1 py-1 text-xs text-muted placeholder:text-faint outline-none"
        />
      </div>

      {/* Columns */}
      {!activeGroup ? (
        <div className="px-4 py-8 text-center text-sm text-faint">
          No lists yet. Add a tab above to start a brain dump.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="thin-scrollbar flex gap-6 overflow-x-auto px-4 py-3">
            {activeGroup.lists.map((list, idx) => (
              <ListColumn
                key={list.id}
                list={list}
                isFirst={idx === 0}
                isLast={idx === activeGroup.lists.length - 1}
                onRename={lists.renameList}
                onDelete={(id) =>
                  setConfirm({ kind: "list", id, label: list.name })
                }
                onMove={(id, dir) => lists.moveList(activeGroup.id, id, dir)}
                onAddItem={lists.addItem}
                onToggleItem={lists.toggleItem}
                onUpdateItemText={(item, text) =>
                  lists.updateItem(item, { text })
                }
                onOpenItem={setDetailItem}
              />
            ))}

            <div className="flex w-[200px] shrink-0 items-start pt-1">
              <input
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newList.trim()) {
                    lists.addList(activeGroup.id, newList);
                    setNewList("");
                  }
                }}
                placeholder="+ New list"
                className="w-full bg-transparent text-xs font-semibold uppercase tracking-wide text-muted placeholder:text-faint outline-none"
              />
            </div>
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="rounded-lg border border-brand-200 bg-surface px-3 py-1.5 text-xs text-ink shadow-lg">
                {activeItem.text}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Item detail */}
      <Sheet
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Item"
        footer={
          detailItem ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const restore = lists.deleteItem(detailItem.id);
                  toast.undo("Item deleted", restore);
                  setDetailItem(null);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-danger hover:bg-danger/10"
              >
                <TrashIcon size={15} /> Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    addTask(todayKey(), detailItem.text);
                    setDetailItem(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
                >
                  <PlusIcon size={14} /> To today
                </button>
                <button
                  onClick={() => setDetailItem(null)}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {detailItem && (
          <>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                Item
              </span>
              <textarea
                value={detailItem.text}
                onChange={(e) => {
                  lists.updateItem(detailItem, { text: e.target.value });
                  setDetailItem({ ...detailItem, text: e.target.value });
                }}
                rows={2}
                className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                Notes
              </span>
              <textarea
                value={detailItem.notes}
                onChange={(e) => {
                  lists.updateItem(detailItem, { notes: e.target.value });
                  setDetailItem({ ...detailItem, notes: e.target.value });
                }}
                rows={5}
                placeholder="Add details…"
                className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "group" ? "Delete tab?" : "Delete list?"}
        message={
          confirm
            ? `“${confirm.label}” and everything in it will be removed.`
            : undefined
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "group") {
            const restore = lists.deleteGroup(confirm.id);
            toast.undo("Tab deleted", restore);
          } else if (confirm?.kind === "list") {
            const restore = lists.deleteList(confirm.id);
            toast.undo("List deleted", restore);
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
