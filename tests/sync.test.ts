import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { SyncStore, type Snapshot, type Mutation } from "../src/lib/db/syncStore";
import { EMPTY_STATE } from "../src/lib/db/entities";
import { DEFAULT_SETTINGS, type Task } from "../src/types";
import { readAllRows } from "../src/lib/db/readAllRows";
import { cloudAdapter } from "../src/lib/db/cloud";
import { todayKey } from "../src/lib/utils/date";

const task = (id = "task", text = "Original"): Task => ({ id, text, date: todayKey(), completed: false, isLabel: false, notes: "", position: 0 });
const initial = (): Snapshot => ({ state: { ...EMPTY_STATE, tasks: [task()] }, settings: DEFAULT_SETTINGS, pending: [], verified: true });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(remote?: { load(): Promise<Pick<Snapshot, "state" | "settings">>; save(m: Mutation): Promise<void> }) {
  let disk = initial();
  let full = false;
  const options = {
    read: () => clone(disk),
    write: (snapshot: Snapshot) => { if (full) throw new Error("quota"); disk = clone(snapshot); },
    remote,
  };
  const store = new SyncStore(options);
  return { store, options, disk: () => disk, fill: (value: boolean) => { full = value; } };
}

test("failed writes remain durable and replay in order after reload", async () => {
  const saved: string[] = [];
  let online = false;
  const remote = { load: async () => initial(), save: async (m: Mutation) => {
    if (!online) throw new Error("offline"); saved.push(m.kind);
  } };
  const f = fixture(remote);
  f.store.put("tasks", [task("task", "Changed offline")]);
  f.store.del("tasks", ["removed"]);
  await f.store.sync(false);
  assert.equal(f.disk().pending.length, 2);
  assert.match(f.store.getSnapshot().error!, /offline/);
  f.store.stop();
  online = true;
  const restored = new SyncStore(f.options);
  await restored.sync(false);
  assert.deepEqual(saved, ["put", "del"]);
  assert.equal(f.disk().pending.length, 0);
  assert.equal(f.disk().state.tasks[0].text, "Changed offline");
  restored.stop();
});

test("failed cloud reads preserve the whole previous snapshot", async () => {
  const f = fixture({ load: async () => { throw new Error("notes unavailable"); }, save: async () => {} });
  await f.store.sync();
  assert.equal(f.disk().state.tasks[0].text, "Original");
  assert.equal(f.store.getSnapshot().state.tasks[0].text, "Original");
  assert.match(f.store.getSnapshot().error!, /notes unavailable/);
  f.store.stop();
});

test("edits made during a background read overlay the returned cloud state", async () => {
  let finish!: (snapshot: Snapshot) => void;
  let started!: () => void;
  const loading = new Promise<void>((resolve) => { started = resolve; });
  const f = fixture({ load: () => { started(); return new Promise((resolve) => { finish = resolve; }); }, save: async () => {} });
  const sync = f.store.sync();
  await loading;
  f.store.put("tasks", [task("task", "Typed while loading")]);
  finish(initial());
  await sync;
  assert.equal(f.disk().state.tasks[0].text, "Typed while loading");
  assert.equal(f.disk().pending.length, 0);
  f.store.stop();
});

test("a rejected parent blocks child writes and sign-out", async () => {
  let saves = 0;
  const f = fixture({ load: async () => initial(), save: async () => { saves++; throw new Error("parent rejected"); } });
  f.store.put("tasks", [task()]);
  f.store.setSettings({ showPanel: false });
  await f.store.sync(false);
  assert.equal(saves, 1);
  assert.equal(f.disk().pending.length, 2);
  await assert.rejects(f.store.flush(), /not saved yet/);
  f.store.stop();
});

test("storage-full drafts stay in memory with an error and persist on retry", async () => {
  const f = fixture();
  f.fill(true);
  f.store.put("tasks", [task("task", "Unsaved draft")]);
  assert.equal(f.store.getSnapshot().state.tasks[0].text, "Unsaved draft");
  assert.match(f.store.getSnapshot().storageError!, /could not save/);
  assert.equal(f.disk().state.tasks[0].text, "Original");
  f.fill(false);
  await f.store.sync(false);
  assert.equal(f.disk().state.tasks[0].text, "Unsaved draft");
  assert.equal(f.store.getSnapshot().storageError, null);
  f.store.stop();
});

test("an old acknowledgement cannot discard a newer typing update", async () => {
  let acknowledge!: () => void;
  let started!: () => void;
  const saving = new Promise<void>((resolve) => { started = resolve; });
  const saved: Mutation[] = [];
  const f = fixture({ load: async () => initial(), save: async (m) => {
    saved.push(m);
    if (saved.length === 1) { started(); await new Promise<void>((resolve) => { acknowledge = resolve; }); }
  } });
  f.store.put("tasks", [task("task", "First")]);
  const sync = f.store.sync(false);
  await saving;
  f.store.put("tasks", [task("task", "Second")]);
  acknowledge();
  await sync;
  assert.equal(saved.length, 2);
  assert.equal(f.disk().state.tasks[0].text, "Second");
  assert.equal(f.disk().pending.length, 0);
  f.store.stop();
});

test("carryover and routine initialisation execute acknowledged writes", async () => {
  const loaded = initial();
  loaded.state.tasks = [{ ...task(), date: "2000-01-01" }];
  loaded.state.routines = [{ id: "routine", text: "Daily task", days: [new Date().getDay()], active: true,
    lastGenerated: null, position: 0, createdAt: new Date().toISOString() }];
  const saved: Mutation[] = [];
  const f = fixture({ load: async () => loaded, save: async (m) => { saved.push(m); } });
  await f.store.sync();
  assert.ok(saved.some((m) => m.kind === "put" && m.key === "tasks"));
  assert.ok(saved.some((m) => m.kind === "put" && m.key === "routines"));
  assert.equal(f.disk().state.tasks.length, 2);
  assert.ok(f.disk().state.tasks.every((t) => t.date === todayKey()));
  assert.equal(f.disk().pending.length, 0);
  f.store.stop();
});

test("local note drafts and preferences persist immediately without a timer", () => {
  const f = fixture();
  f.store.put("notes", [{ id: "note", title: "New", body: "Last keystroke", createdAt: "now", updatedAt: "now" }]);
  f.store.setSettings({ showPanel: false });
  f.store.stop();
  const reloaded = new SyncStore(f.options);
  assert.equal(reloaded.getSnapshot().state.notes[0].body, "Last keystroke");
  assert.equal(reloaded.getSnapshot().settings.showPanel, false);
  reloaded.stop();
});

function mockClient(fetcher: typeof fetch) {
  return createClient("https://example.invalid", "test", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } });
}

test("pagination returns more than 1000 rows even with a low server cap", async () => {
  const all = Array.from({ length: 1207 }, (_, i) => ({ id: String(i).padStart(5, "0") }));
  const client = mockClient(async (input) => {
    const url = new URL(String(input));
    const after = url.searchParams.get("id")?.slice(3);
    const remaining = all.filter((r) => !after || r.id > after);
    const page = remaining.slice(0, 37);
    return new Response(JSON.stringify(page), { headers: { "content-type": "application/json", "content-range": `0-${page.length - 1}/${remaining.length}` } });
  });
  assert.equal((await readAllRows(client, "tasks")).length, 1207);
});

test("a truncated or changing export fails rather than reporting a full backup", async () => {
  const client = mockClient(async (input) => {
    const cursor = new URL(String(input)).searchParams.has("id");
    return new Response(JSON.stringify(cursor ? [] : [{ id: "a" }]), {
      headers: { "content-type": "application/json", "content-range": cursor ? "*/0" : "0-0/2" },
    });
  });
  await assert.rejects(readAllRows(client, "tasks"), /complete copy/);
});

test("cloud adapter actually executes an upsert and propagates errors", async () => {
  let calls = 0;
  const client = mockClient(async () => { calls++; return new Response(JSON.stringify({ message: "denied" }), { status: 403 }); });
  await assert.rejects(cloudAdapter(client, "user").save({ id: "op", kind: "put", key: "tasks", items: [task()] }), /denied/);
  assert.equal(calls, 1);
});
