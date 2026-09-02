"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/date";
import { useAppData } from "@/state/AppDataProvider";
import { NAVIGATE_EVENT } from "@/shared/hooks/useDeepLink";
import {
  CalendarIcon,
  ImagesIcon,
  ListIcon,
  NoteIcon,
  SearchIcon,
  StackIcon,
  SunIcon,
} from "@/shared/ui/icons";

export const OPEN_SEARCH_EVENT = "daily:open-search";

const PER_KIND = 6;

interface Result {
  id: string;
  kind: string;
  label: string;
  sub: string;
  href: string;
  Icon: typeof CalendarIcon;
}

/** ~60 chars of context around the first match, or null if no match. */
function snippet(text: string, q: string): string | null {
  const lower = text.toLowerCase();
  const at = lower.indexOf(q);
  if (at < 0) return null;
  const start = Math.max(0, at - 28);
  const end = Math.min(text.length, at + q.length + 32);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
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

  const collectionMeta = useMemo(() => {
    const m = new Map<string, { year: number; name: string }>();
    for (const c of data.collections) m.set(c.id, { year: c.year, name: c.name });
    return m;
  }, [data.collections]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    const count = (kind: string) => out.filter((r) => r.kind === kind).length;

    for (const t of data.tasks) {
      if (t.isLabel || count("Task") >= PER_KIND) continue;
      const inText = t.text.toLowerCase().includes(q);
      const inNotes = !inText && t.notes ? snippet(t.notes, q) : null;
      if (!inText && !inNotes) continue;
      out.push({
        id: t.id,
        kind: "Task",
        label: t.text,
        sub: inNotes ? `${formatLongDate(t.date)} · ${inNotes}` : formatLongDate(t.date),
        href: "/",
        Icon: CalendarIcon,
      });
    }

    for (const i of data.listItems) {
      if (count("List") >= PER_KIND) break;
      const inText = i.text.toLowerCase().includes(q);
      const inNotes = !inText && i.notes ? snippet(i.notes, q) : null;
      if (!inText && !inNotes) continue;
      const list = listNames.get(i.listId) ?? "Brain dump";
      out.push({
        id: i.id,
        kind: "List",
        label: i.text,
        sub: inNotes ? `${list} · ${inNotes}` : list,
        href: "/",
        Icon: ListIcon,
      });
    }

    for (const n of data.notes) {
      if (count("Note") >= PER_KIND) break;
      const inTitle = n.title.toLowerCase().includes(q);
      const inBody = !inTitle ? snippet(n.body, q) : null;
      if (!inTitle && !inBody) continue;
      out.push({
        id: n.id,
        kind: "Note",
        label: n.title || "Untitled note",
        sub: inBody ?? snippet(n.body, n.body.slice(0, 1).toLowerCase()) ?? "",
        href: `/notes?note=${n.id}`,
        Icon: NoteIcon,
      });
    }

    for (const m of data.memories) {
      if (count("Memory") >= PER_KIND) break;
      const hay = `${m.title} ${m.body} ${m.quoteAuthor}`;
      const s = snippet(hay, q);
      if (!s) continue;
      out.push({
        id: m.id,
        kind: "Memory",
        label: m.title || m.body || m.quoteAuthor || "Memory",
        sub: `${formatLongDate(m.occurredOn)}${m.title && s ? ` · ${s}` : ""}`,
        href: `/memories?year=${m.occurredOn.slice(0, 4)}`,
        Icon: ImagesIcon,
      });
    }

    for (const c of data.collectionItems) {
      if (count("Year") >= PER_KIND) break;
      const inHead = `${c.title} ${c.creator}`.toLowerCase().includes(q);
      const inNotes = !inHead ? snippet(`${c.review} ${c.notes}`, q) : null;
      if (!inHead && !inNotes) continue;
      const meta = collectionMeta.get(c.collectionId);
      const where = meta ? (meta.year === 0 ? `${meta.name} · All time` : `${meta.name} ${meta.year}`) : "";
      out.push({
        id: c.id,
        kind: "Year",
        label: c.title,
        sub: [c.creator, where, inNotes].filter(Boolean).join(" · "),
        href: `/year?year=${meta?.year ?? ""}`,
        Icon: StackIcon,
      });
    }

    for (const ci of data.checkIns) {
      if (count("Check-in") >= PER_KIND) break;
      const hit =
        ci.gratitude.find((g) => g.toLowerCase().includes(q)) ??
        (ci.note.toLowerCase().includes(q) ? ci.note : null);
      if (!hit) continue;
      out.push({
        id: ci.id,
        kind: "Check-in",
        label: snippet(hit, q) ?? hit,
        sub: `${formatLongDate(ci.date)} · ${ci.kind}`,
        href: `/check-ins?date=${ci.date}`,
        Icon: SunIcon,
      });
    }

    return out;
  }, [
    query,
    data.tasks,
    data.listItems,
    data.notes,
    data.memories,
    data.collectionItems,
    data.checkIns,
    listNames,
    collectionMeta,
  ]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  function go(r: Result | undefined) {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
    // An already-mounted view won't re-run its mount effect — nudge it.
    window.setTimeout(() => window.dispatchEvent(new Event(NAVIGATE_EVENT)), 150);
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
            placeholder="Search everything…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-faint sm:block">
            ESC
          </kbd>
        </div>

        <div className="thin-scrollbar max-h-[55vh] overflow-y-auto p-1.5">
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center text-sm text-faint">
              Tasks, lists, notes, memories, book notes &amp; quotes, gratitudes.
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
