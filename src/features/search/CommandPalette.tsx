"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/date";
import { useAppData } from "@/state/AppDataProvider";
import {
  CalendarIcon,
  ImagesIcon,
  ListIcon,
  SearchIcon,
  StackIcon,
} from "@/shared/ui/icons";

export const OPEN_SEARCH_EVENT = "daily:open-search";

interface Result {
  id: string;
  kind: string;
  label: string;
  sub: string;
  href: string;
  Icon: typeof CalendarIcon;
}

export function CommandPalette() {
  const router = useRouter();
  const data = useAppData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const listNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of data.lists) m.set(l.id, l.name);
    return m;
  }, [data.lists]);

  const collectionYears = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.collections) m.set(c.id, c.year);
    return m;
  }, [data.collections]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];

    for (const t of data.tasks) {
      if (t.isLabel || !t.text.toLowerCase().includes(q)) continue;
      out.push({
        id: t.id,
        kind: "Task",
        label: t.text,
        sub: formatLongDate(t.date),
        href: "/",
        Icon: CalendarIcon,
      });
      if (out.filter((r) => r.kind === "Task").length >= 6) break;
    }
    for (const i of data.listItems) {
      if (!i.text.toLowerCase().includes(q)) continue;
      out.push({
        id: i.id,
        kind: "List",
        label: i.text,
        sub: listNames.get(i.listId) ?? "Brain dump",
        href: "/",
        Icon: ListIcon,
      });
      if (out.filter((r) => r.kind === "List").length >= 6) break;
    }
    for (const m of data.memories) {
      const hay = `${m.title} ${m.body} ${m.quoteAuthor}`.toLowerCase();
      if (!hay.includes(q)) continue;
      out.push({
        id: m.id,
        kind: "Memory",
        label: m.title || m.body || m.quoteAuthor || "Memory",
        sub: formatLongDate(m.occurredOn),
        href: "/memories",
        Icon: ImagesIcon,
      });
      if (out.filter((r) => r.kind === "Memory").length >= 6) break;
    }
    for (const c of data.collectionItems) {
      const hay = `${c.title} ${c.creator}`.toLowerCase();
      if (!hay.includes(q)) continue;
      const year = collectionYears.get(c.collectionId);
      out.push({
        id: c.id,
        kind: "Year",
        label: c.title,
        sub: [c.creator, year].filter(Boolean).join(" · "),
        href: "/year",
        Icon: StackIcon,
      });
      if (out.filter((r) => r.kind === "Year").length >= 6) break;
    }
    return out;
  }, [query, data.tasks, data.listItems, data.memories, data.collectionItems, listNames, collectionYears]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  function go(r: Result | undefined) {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-center px-4 pt-[12vh]">
      <button
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-ink/40 animate-fade-in"
      />
      <div className="relative h-fit w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-xl animate-fade-rise">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <SearchIcon size={18} className="text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                go(results[active]);
              }
            }}
            placeholder="Search tasks, memories, books…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-faint sm:block">
            ESC
          </kbd>
        </div>

        <div className="thin-scrollbar max-h-[55vh] overflow-y-auto p-1.5">
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              Search across your days, lists, memories and year.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              No matches for “{query}”.
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                  i === active ? "bg-sand" : "hover:bg-sand/60",
                )}
              >
                <r.Icon size={16} className="shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">
                    {r.label}
                  </span>
                  {r.sub && (
                    <span className="block truncate text-xs text-faint">
                      {r.sub}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-faint">
                  {r.kind}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
