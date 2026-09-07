import { EMPTY_STATE, type EntityState, type StateKey } from "./entities";
import { DEFAULT_SETTINGS, type AppSettings } from "../../types";
import { newId } from "../utils/id";
import { carryOverTasks } from "./carryover";
import { generateRoutineTasks } from "./routines";

export type Mutation =
  | { id: string; kind: "put"; key: StateKey; items: { id: string }[] }
  | { id: string; kind: "del"; key: StateKey; ids: string[] }
  | { id: string; kind: "settings"; patch: Partial<AppSettings> };

export interface Snapshot {
  state: EntityState;
  settings: AppSettings;
  pending: Mutation[];
  /** Only true after a complete successful cloud read. */
  verified: boolean;
}

export interface SyncView extends Snapshot {
  status: "loading" | "ready";
  syncing: boolean;
  error: string | null;
  storageError: string | null;
}

interface Options {
  read(): Snapshot | null;
  write(snapshot: Snapshot): void;
  remote?: {
    load(): Promise<Pick<Snapshot, "state" | "settings">>;
    save(mutation: Mutation): Promise<void>;
  };
  lock?<T>(work: () => Promise<T>): Promise<T>;
}

const empty = (): Snapshot => ({
  state: EMPTY_STATE, settings: DEFAULT_SETTINGS, pending: [], verified: false,
});

export function applyMutation(snapshot: Snapshot, mutation: Mutation): Snapshot {
  if (mutation.kind === "settings") {
    return { ...snapshot, settings: { ...snapshot.settings, ...mutation.patch } };
  }
  const existing = snapshot.state[mutation.key] as { id: string }[];
  const items = mutation.kind === "put"
    ? [...new Map([...existing, ...mutation.items].map((item) => [item.id, item])).values()]
    : existing.filter((item) => !mutation.ids.includes(item.id));
  return { ...snapshot, state: { ...snapshot.state, [mutation.key]: items } };
}

/**
 * Local snapshot and outbox are one synchronous, atomic storage write. A failed
 * request stays at the head of the queue, preserving parent/child write order.
 * Cloud reads never replace pending edits, and failed reads replace nothing.
 */
export class SyncStore {
  private snapshot: Snapshot = empty();
  private view: SyncView;
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private storageError: string | null = null;
  private error: string | null = null;
  private status: "loading" | "ready" = "loading";
  private syncing = false;

  constructor(private options: Options) {
    try { this.snapshot = options.read() ?? empty(); }
    catch { this.storageError = "Local data could not be read. Keep this page open and retry."; }
    this.view = this.buildView();
  }

  private buildView(): SyncView {
    return { ...this.snapshot, status: this.status, syncing: this.syncing,
      error: this.error, storageError: this.storageError };
  }
  private publish() {
    this.view = this.buildView();
    this.listeners.forEach((listener) => listener());
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Read the latest document before modifying it, including other tabs' edits. */
  private latest() {
    if (this.storageError) return this.snapshot;
    try { return this.options.read() ?? this.snapshot; }
    catch {
      this.storageError = "Local data could not be read. Keep this page open and retry.";
      return this.snapshot;
    }
  }
  private persist(snapshot: Snapshot): boolean {
    this.snapshot = snapshot;
    try {
      this.options.write(snapshot);
      this.storageError = null;
      return true;
    } catch {
      this.storageError = "This device could not save your changes. Keep this page open, export a backup, and free browser storage before retrying.";
      return false;
    } finally { this.publish(); }
  }

  private commit(mutation: Mutation) {
    if (this.stopped) return;
    let next = applyMutation(this.latest(), mutation);
    if (this.options.remote) {
      const pending = [...next.pending];
      const previous = pending[pending.length - 1];
      // Coalesce consecutive typing updates. A new operation id ensures an
      // older in-flight acknowledgement cannot remove the replacement.
      if (previous?.kind === "put" && mutation.kind === "put" && previous.key === mutation.key) {
        mutation = { ...mutation, items: [...new Map(
          [...previous.items, ...mutation.items].map((item) => [item.id, item]),
        ).values()] };
        pending.pop();
      } else if (previous?.kind === "settings" && mutation.kind === "settings") {
        mutation = { ...mutation, patch: { ...previous.patch, ...mutation.patch } };
        pending.pop();
      }
      next = { ...next, pending: [...pending, mutation] };
    }
    if (this.persist(next)) this.schedule();
  }
  put = <K extends StateKey>(key: K, items: EntityState[K]) => {
    if (items.length) this.commit({ id: newId(), kind: "put", key, items });
  };
  del = (key: StateKey, ids: string[]) => {
    if (ids.length) this.commit({ id: newId(), kind: "del", key, ids });
  };
  setSettings = (patch: Partial<AppSettings>) => {
    this.commit({ id: newId(), kind: "settings", patch });
  };

  private schedule() {
    clearTimeout(this.timer);
    if (this.options.remote && !this.stopped) {
      this.timer = setTimeout(() => { void this.sync(false); }, 600);
    }
  }

  private generateDaily() {
    const current = this.latest();
    const carried = carryOverTasks(current.state.tasks);
    const generated = generateRoutineTasks(current.state.routines, carried.tasks);
    this.put("tasks", [...carried.changed, ...generated.changedTasks]);
    this.put("routines", generated.changedRoutines);
  }

  private async drain() {
    if (!this.options.remote) return;
    for (;;) {
      if (this.stopped) return;
      this.snapshot = this.latest();
      const mutation = this.snapshot.pending[0];
      if (!mutation) return;
      await this.options.remote.save(mutation);
      if (this.stopped) return;
      const latest = this.latest();
      if (!this.persist({ ...latest, pending: latest.pending.filter((m) => m.id !== mutation.id) })) {
        throw new Error("Could not record the save on this device. Retry when storage is available.");
      }
    }
  }

  sync = (refresh = true): Promise<void> => {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    clearTimeout(this.timer);
    const work = async () => {
      if (this.stopped) return;
      this.syncing = !!this.options.remote;
      if (refresh) this.error = null;
      this.publish();
      try {
        if (this.storageError && !this.persist(this.snapshot)) return;
        await this.drain();
        if (this.stopped) return;
        if (refresh && this.options.remote) {
          const loaded = await this.options.remote.load();
          if (this.stopped) return;
          const latest = this.latest();
          let merged: Snapshot = { ...loaded, pending: latest.pending, verified: true };
          for (const mutation of latest.pending) merged = applyMutation(merged, mutation);
          if (!this.persist(merged)) return;
        }
        if (refresh) this.generateDaily();
        await this.drain();
      } catch (error) {
        if (!this.stopped) this.error = error instanceof Error ? error.message : "Sync failed. Your local changes are kept; please retry.";
      } finally {
        if (!this.stopped) {
          this.status = "ready";
          this.syncing = false;
          this.publish();
        }
      }
    };
    this.running = (this.options.lock ? this.options.lock(work) : work())
      .finally(() => { this.running = null; });
    return this.running;
  };

  /** Sign-out must not erase pending changes in this tab or another tab. */
  flush = async () => {
    await this.sync(false);
    // A refresh may already have been running; include edits made during it.
    if (this.latest().pending.length) await this.sync(false);
    if (this.latest().pending.length || this.storageError) {
      throw new Error("Some changes are not saved yet. Reconnect and retry sync before signing out.");
    }
  };

  receiveStorage = () => {
    if (this.stopped || this.storageError) return;
    this.snapshot = this.latest();
    this.publish();
  };
  start = () => { this.stopped = false; void this.sync(); };
  stop = () => { this.stopped = true; clearTimeout(this.timer); };
}
