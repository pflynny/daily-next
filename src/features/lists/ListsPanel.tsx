"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DragOverlay,
  useDndMonitor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils/cn";
import { formatLongDate, todayKey } from "@/lib/utils/date";
import { Sheet } from "@/shared/ui/Sheet";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/ToastProvider";
import { ChevronLeft, ChevronRight, MoreIcon, PlusIcon, TrashIcon, XIcon } from "@/shared/ui/icons";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "@/shared/ui/DropdownMenu";
import { ActiveDragChip } from "@/shared/components/ActiveDragChip";
import { NotesField } from "@/shared/components/NotesField";
import { useTasks } from "@/features/daily/useTasks";
import { useLists } from "./useLists";
import { ListColumn } from "./ListColumn";
import type { ListItem } from "@/types";

export function ListsPanel() {
  const lists = useLists();
  const { addTask, deleteTask } = useTasks();
  const toast = useToast();
  const { groups } = lists;

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [newTab, setNewTab] = useState("");
  const [newList, setNewList] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabDraft, setTabDraft] = useState("");
  const [detailItem, setDetailItem] = useState<ListItem | null>(null);
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

  /** Move a dumped item onto a day's task list (undo restores it here). */
  function moveToDay(item: ListItem, dateKey: string) {
    const taskId = addTask(dateKey, item.text, false, item.notes);
    const restoreItem = lists.deleteItem(item.id);
    const label =
      dateKey === todayKey() ? "Moved to today" : `Moved to ${formatLongDate(dateKey)}`;
    toast.undo(label, () => {
      restoreItem();
      if (taskId) deleteTask(taskId);
    });
  }

  function doToday(item: ListItem) {
    moveToDay(item, todayKey());
  }

  function findItem(id: string): ListItem | null {
    for (const list of activeGroup?.lists ?? []) {
      const item = list.items.find((i) => i.id === id);
      if (item) return item;
    }
    return null;
  }

  // Drags are owned by the DailyView-level DndContext; this monitor picks
  // up only list-item drags (task drags are handled up there).
  useDndMonitor({
    onDragEnd(e: DragEndEvent) {
      if (e.active.data.current?.type !== "listItem") return;
      const { active, over } = e;
      if (!over || !activeGroup) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      const overData = over.data.current as
        | { type?: string; listId?: string; date?: string }
        | undefined;

      // Dropped on a day column (or a task inside one) → becomes a task there.
      if (overData?.date) {
        const item = findItem(activeId);
        if (item) moveToDay(item, overData.date);
        return;
      }

      const fromListId = active.data.current?.listId as string | undefined;
      const toListId = overData?.listId;
      if (!fromListId || !toListId) return;

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
        const overIsItem = overData?.type === "listItem";
        lists.moveItem(activeId, toListId, overIsItem ? overId : null);
      }
    },
  });

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 pt-3">
        {groups.map((group, idx) => {
          const active = group.id === activeGroup?.id;
          const isFirst = idx === 0;
          const isLast = idx === groups.length - 1;
          return (
            <div
              key={group.id}
              className="flex shrink-0 items-center gap-0.5 pb-0.5"
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
                  className={cn(
                    "px-1 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                    active ? "text-ink border-b-2 border-brand-500" : "text-muted hover:text-ink",
                  )}
                >
                  {group.title}
                </button>
              )}

              <DropdownMenu
                align="left"
                trigger={
                  <button aria-label="Tab options" className="rounded p-0.5 text-faint hover:text-ink">
                    <MoreIcon size={13} />
                  </button>
                }
              >
                <DropdownItem onClick={() => lists.moveGroup(group.id, -1)} disabled={isFirst}>
                  <ChevronLeft size={13} /> Move left
                </DropdownItem>
                <DropdownItem onClick={() => lists.moveGroup(group.id, 1)} disabled={isLast}>
                  <ChevronRight size={13} /> Move right
                </DropdownItem>
                <DropdownItem onClick={() => { setTabDraft(group.title); setEditingTabId(group.id); }}>
                  Rename
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem danger onClick={() => setConfirm({ kind: "group", id: group.id, label: group.title })}>
                  <XIcon size={13} /> Delete tab
                </DropdownItem>
              </DropdownMenu>
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
        <>
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
                onDeleteItem={(item) => {
                  const restore = lists.deleteItem(item.id);
                  toast.undo("Item deleted", restore);
                }}
                onDoTodayItem={doToday}
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

          <DragOverlay dropAnimation={null}>
            <ActiveDragChip kind="listItem" className="text-xs" />
          </DragOverlay>
        </>
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
                    doToday(detailItem);
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
            <NotesField
              value={detailItem.notes}
              placeholder="Add details… (markdown works)"
              onChange={(notes) => {
                lists.updateItem(detailItem, { notes });
                setDetailItem({ ...detailItem, notes });
              }}
            />
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
