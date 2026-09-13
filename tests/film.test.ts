import test from "node:test";
import assert from "node:assert/strict";
import { makeFilm, sceneAt, filmDuration, filmCandidates, type FilmScene } from "../src/features/wrapped/film/timeline";
import { resolveByteRange } from "../src/lib/storage/byteRange";
import type { WrappedData } from "../src/features/wrapped/useWrapped";
import type { MemoryView } from "../src/types";

const photo = (id: string, date: string, priority = false): FilmScene => ({ id, date, priority, title: id, label: "Memory", kind: "image", url: "/photo.jpg", duration: 4, start: 0 });

test("draft spans the year, prefers milestones and excludes personal reflections by default", () => {
  const candidates = Array.from({ length: 30 }, (_, i) => photo(`jan-${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`, i === 28));
  candidates.push(photo("dec", "2026-12-01"), { ...photo("private", "2026-01-01"), personal: true });
  const draft = makeFilm(2026, candidates);
  assert(draft.some(s => s.id === "jan-28"));
  assert(draft.some(s => s.id === "dec"));
  assert(!draft.some(s => s.personal));
  assert.equal(draft.filter(s => s.date?.startsWith("2026-01")).length, 3);
  assert(makeFilm(2026, candidates, true).some(s => s.personal));
  assert.equal(new Set(draft.map(s => s.id)).size, draft.length);
});

test("an empty year has no fabricated film and scene boundaries use the following scene", () => {
  assert.deepEqual(makeFilm(2026, []), []);
  const scenes = [photo("a", "2026-01-01"), photo("b", "2026-02-01")];
  assert.equal(filmDuration(scenes), 8);
  assert.equal(sceneAt(scenes, 4)?.scene.id, "b");
  assert.equal(sceneAt(scenes, 4)?.local, 0);
  assert.equal(sceneAt(scenes, 99)?.local, 4);
  assert.equal(sceneAt([], 0), null);
});

test("candidates include videos beyond Wrapped's six-photo shortlist and keep years isolated", () => {
  const memories = Array.from({ length: 9 }, (_, i) => ({ id: String(i), occurredOn: i === 8 ? "2025-01-01" : "2026-02-02", title: "Clip", body: "", type: "video", milestone: false, media: [{ id: `v${i}`, kind: "video", url: "/video.mp4" }] } as MemoryView));
  const wrapped = { quotes: { all: [] }, gratitude: { entries: [] }, feelings: { counts: [] } } as unknown as WrappedData;
  const candidates = filmCandidates(2026, memories, [], [], wrapped);
  assert.equal(candidates.length, 8);
  assert(candidates.every(s => s.kind === "video"));
  assert(!candidates.some(s => s.id === "media:v8"));
});

test("HTTP ranges handle seeking, suffixes, end bounds and invalid requests", () => {
  assert.deepEqual(resolveByteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(resolveByteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(resolveByteRange("bytes=-20", 100), { start: 80, end: 99 });
  assert.deepEqual(resolveByteRange("bytes=0-999", 100), { start: 0, end: 99 });
  assert.equal(resolveByteRange("bytes=100-", 100), "unsatisfiable");
  assert.equal(resolveByteRange("bytes=-0", 100), "unsatisfiable");
  assert.equal(resolveByteRange("bytes=0-", 0), "unsatisfiable");
  for (const range of [null, "garbage", "bytes=", "bytes=3-1", "bytes=0-1,3-4", "bytes=999999999999999999999-"]) assert.equal(resolveByteRange(range, 100), null);
});
