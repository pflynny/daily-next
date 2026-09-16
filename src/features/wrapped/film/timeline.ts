import { playbackUrl } from "@/lib/storage/media";
import type { Collection, CollectionItem, MemoryView } from "@/types";
import type { WrappedData } from "../useWrapped";

export interface FilmScene {
  id: string;
  kind: "card" | "image" | "video";
  title: string;
  label: string;
  url?: string;
  duration: number;
  start: number;
  date?: string;
  priority?: boolean;
  personal?: boolean;
}

export const MAX_FILM_SECONDS = 300;
export const MAX_VIDEO_SCENES = 8;
export const DEFAULT_VIDEO_SECONDS = 5;
export const filmDuration = (scenes: FilmScene[]) => scenes.reduce((n, s) => n + s.duration, 0);
export const monthLabel = (date: string) => new Date(`${date.slice(0, 7)}-15T12:00:00`).toLocaleDateString("en-GB", { month: "long" });

export function filmCandidates(year: number, memories: MemoryView[], collections: Collection[], items: CollectionItem[], wrapped: WrappedData): FilmScene[] {
  const scenes: FilmScene[] = [];
  for (const memory of memories.filter(m => m.occurredOn.startsWith(`${year}-`))) {
    const base = { title: memory.title || memory.body || "A moment to remember", label: `${monthLabel(memory.occurredOn)}${memory.milestone ? " · ★ Milestone" : ""}`, date: memory.occurredOn, priority: memory.milestone, start: 0 };
    for (const media of memory.media) {
      scenes.push({ ...base, id: `media:${media.id}`, kind: media.kind, url: media.kind === "video" ? playbackUrl(media) : media.url, duration: media.kind === "video" ? 6 : 4 });
    }
    if (memory.type === "quote" || (!memory.media.length && (memory.title || memory.body))) {
      scenes.push({ ...base, id: `memory:${memory.id}`, kind: "card", title: memory.type === "quote" ? `“${memory.body || memory.title}”` : base.title, label: memory.quoteAuthor || base.label, duration: 5 });
    }
  }
  const ids = new Set(collections.filter(c => c.year === year).map(c => c.id));
  for (const item of items.filter(i => ids.has(i.collectionId))) {
    if (item.pick) scenes.push({ id: `pick:${item.id}`, kind: "card", title: item.title, label: "★ Pick of the year", duration: 5, start: 0, priority: true });
    // Only explicit Markdown blockquotes are treated as quotations; never guess from a review.
    const quotes = item.notes.match(/(?:^>[^\n]*(?:\n|$))+/gm) ?? [];
    quotes.forEach((quote, index) => scenes.push({ id: `book:${item.id}:${index}`, kind: "card", title: quote.replace(/^>\s?/gm, "").trim(), label: `${item.title}${item.creator ? ` · ${item.creator}` : ""}`, duration: 6, start: 0 }));
  }
  wrapped.quotes.all.forEach(q => scenes.push({ id: `quote:${q.id}`, kind: "card", title: `“${q.text}”`, label: q.author || "Words to keep", duration: 5, start: 0 }));
  wrapped.gratitude.entries.forEach((g, i) => scenes.push({ id: `gratitude:${g.date}:${i}`, kind: "card", title: g.text, label: "Grateful for", duration: 5, start: 0, personal: true }));
  if (wrapped.feelings.counts.length) scenes.push({ id: "feelings", kind: "card", title: wrapped.feelings.counts.slice(0, 5).map(([word]) => word).join(" · "), label: "How the year felt", duration: 5, start: 0, personal: true });
  return scenes;
}

export function makeFilm(year: number, candidates: FilmScene[], personal = false): FilmScene[] {
  const selected: FilmScene[] = [];
  for (let month = 1; month <= 12; month++) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const pool = candidates.filter(s => s.date?.startsWith(prefix) && !s.personal);
    // Prefer milestones, then sample across the month instead of taking its first few uploads.
    const picks = pool.filter(s => s.priority).slice(0, 2);
    const rest = pool.filter(s => !picks.includes(s));
    const slots = 3 - picks.length;
    for (let i = 0; i < slots && rest.length; i++) {
      const s = rest[Math.floor(i * rest.length / slots)];
      if (!picks.includes(s)) picks.push(s);
    }
    selected.push(...picks.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")));
  }
  selected.push(...candidates.filter(s => !s.date && !s.personal).sort((a, b) => Number(!!b.priority) - Number(!!a.priority)).slice(0, 4));
  if (personal) selected.push(...candidates.filter(s => s.personal).slice(-3));
  // A few short clips give the film rhythm without making every export fetch
  // dozens of large source files.
  let videoCount = 0;
  const capped = selected.filter(scene => {
    if (scene.kind !== "video") return true;
    if (videoCount >= MAX_VIDEO_SCENES) return false;
    videoCount++;
    scene.duration = Math.min(scene.duration, DEFAULT_VIDEO_SECONDS);
    return true;
  });
  if (!capped.length) return [];
  return [
    { id: "intro", kind: "card", title: String(year), label: "A year to remember", duration: 3, start: 0 },
    ...capped,
    { id: "outro", kind: "card", title: "Here's to the moments we kept.", label: String(year), duration: 4, start: 0 },
  ];
}

export function sceneAt(scenes: FilmScene[], time: number) {
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (time < offset + scenes[i].duration || i === scenes.length - 1) return { scene: scenes[i], index: i, local: Math.max(0, Math.min(time - offset, scenes[i].duration)), offset };
    offset += scenes[i].duration;
  }
  return null;
}
