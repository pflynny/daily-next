"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/shared/ui/ToastProvider";
import { ChevronLeft, InfoIcon, NoteIcon, PlusIcon, TrashIcon } from "@/shared/ui/icons";
import { DropdownMenu } from "@/shared/ui/DropdownMenu";
import { Markdown } from "@/shared/ui/Markdown";
import { useNotes } from "./useNotes";
import type { Note } from "@/types";

function updatedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function timestampLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function NotesView() {
  const notes = useNotes();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = notes.all.find((n) => n.id === openId) ?? null;

  if (open) {
    return (
      <NoteEditor
        key={open.id}
        note={open}
        onBack={() => setOpenId(null)}
        onChange={(patch) => notes.updateNote(open, patch)}
        onDelete={() => {
          setOpenId(null);
          const restore = notes.deleteNote(open.id);
          toast.undo("Note deleted", restore);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="NOTES">
        <button
          onClick={() => setOpenId(notes.addNote())}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
        >
          <PlusIcon size={15} /> Note
        </button>
      </PageHeader>

      <Screen>
        {notes.all.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
            <NoteIcon size={40} className="text-brand-300" />
            <h2 className="mt-4 text-sm font-semibold text-ink">No notes yet</h2>
            <p className="mt-1 text-sm text-muted">
              Jot down anything — ideas, plans, snippets. Markdown works:
              headings, lists, links, checkboxes.
            </p>
            <button
              onClick={() => setOpenId(notes.addNote())}
              className="mt-5 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
            >
              <PlusIcon size={15} /> New note
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2 p-4 pb-12">
            {notes.all.map((note) => (
              <button
                key={note.id}
                onClick={() => setOpenId(note.id)}
                className="block w-full rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand-300"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">
                    {note.title || "Untitled"}
                  </span>
                  <span className="shrink-0 text-[11px] text-faint">
                    {updatedLabel(note.updatedAt)}
                  </span>
                </div>
                {note.body.trim() && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {note.body.replace(/[#*`>\-\[\]]/g, "").slice(0, 200)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </Screen>
    </div>
  );
}

/* ---------------------------- Editor ------------------------------ */

function NoteEditor({
  note,
  onBack,
  onChange,
  onDelete,
}: {
  note: Note;
  onBack: () => void;
  onChange: (patch: Partial<Pick<Note, "title" | "body">>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [preview, setPreview] = useState(false);
  const saved = useRef({ title: note.title, body: note.body });
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content so the page scrolls (scrollbar at
  // the window edge) instead of the textarea scrolling internally.
  function autosize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
  useEffect(() => {
    autosize();
  }, [preview]);

  // Debounced auto-save while typing.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const patch: Partial<Pick<Note, "title" | "body">> = {};
      if (title !== saved.current.title) patch.title = title;
      if (body !== saved.current.body) patch.body = body;
      if (Object.keys(patch).length) {
        saved.current = { title, body };
        onChange(patch);
      }
    }, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2.5 backdrop-blur">
        <button
          onClick={onBack}
          aria-label="Back to notes"
          className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-faint"
        />
        <div className="flex shrink-0 items-center rounded-lg border border-line p-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <button
            onClick={() => setPreview(false)}
            className={cn(
              "rounded-md px-2 py-1",
              !preview ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Write
          </button>
          <button
            onClick={() => setPreview(true)}
            className={cn(
              "rounded-md px-2 py-1",
              preview ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
            )}
          >
            Preview
          </button>
        </div>
        <DropdownMenu
          trigger={
            <button
              aria-label="Note info"
              className="rounded-lg p-1.5 text-faint hover:bg-sand hover:text-ink"
            >
              <InfoIcon size={16} />
            </button>
          }
        >
          <div className="space-y-2 px-3 py-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                Created on
              </div>
              <div className="whitespace-nowrap text-xs text-ink">
                {timestampLabel(note.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                Last edited
              </div>
              <div className="whitespace-nowrap text-xs text-ink">
                {timestampLabel(note.updatedAt)}
              </div>
            </div>
          </div>
        </DropdownMenu>
        <button
          onClick={onDelete}
          aria-label="Delete note"
          className="rounded-lg p-1.5 text-faint hover:bg-sand hover:text-danger"
        >
          <TrashIcon size={16} />
        </button>
      </header>

      <Screen>
        <div className="mx-auto max-w-2xl p-4">
          {preview ? (
            body.trim() ? (
              <Markdown>{body}</Markdown>
            ) : (
              <p className="text-sm text-faint">Nothing to preview yet.</p>
            )
          ) : (
            <textarea
              ref={taRef}
              autoFocus
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                autosize();
              }}
              placeholder={"Write in markdown…\n\n# Heading\n- list item\n- [ ] todo\n**bold** and [links](https://example.com)"}
              className="min-h-[75vh] w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-faint/60"
            />
          )}
        </div>
      </Screen>
    </div>
  );
}
