"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  EMPTY_STATE,
  ENTITIES,
  STATE_KEYS,
  type EntityState,
  type StateKey,
} from "@/lib/db/entities";
import { carryOverTasks } from "@/lib/db/carryover";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types";

interface HasId {
  id: string;
}

interface AppDataValue extends EntityState {
  status: "loading" | "ready";
  settings: AppSettings;
  /** Optimistically insert/update rows in a collection (and sync to cloud). */
  put<K extends StateKey>(key: K, items: EntityState[K]): void;
  /** Optimistically delete rows by id (and sync to cloud). */
  del(key: StateKey, ids: string[]): void;
  setSettings(patch: Partial<AppSettings>): void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

const SNAPSHOT_PREFIX = "daily-next:v1";

function snapshotKey(userId: string | null): string {
  return `${SNAPSHOT_PREFIX}:${userId ?? "guest"}`;
}

function upsertMany<T extends HasId>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing;
  const map = new Map(existing.map((row) => [row.id, row]));
  for (const row of incoming) map.set(row.id, row);
  return Array.from(map.values());
}

function loadSnapshot(
  key: string,
): { state: EntityState; settings: AppSettings } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = { ...EMPTY_STATE };
    for (const k of STATE_KEYS) {
      if (Array.isArray(parsed.state?.[k])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any)[k] = parsed.state[k];
      }
    }
    return {
      state,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return null;
  }
}

async function fetchAll(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ state: EntityState; settings: AppSettings }> {
  const state: EntityState = { ...EMPTY_STATE };

  await Promise.all(
    STATE_KEYS.map(async (key) => {
      const { table, orderBy, fromRow } = ENTITIES[key];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order(orderBy, { ascending: true });
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any)[key] = data.map(fromRow);
      }
    }),
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", userId)
    .maybeSingle();

  return {
    state,
    settings: { ...DEFAULT_SETTINGS, ...(profile?.settings ?? {}) },
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { cloud, user } = useAuth();
  const userId = cloud ? (user?.id ?? null) : null;

  const [data, setData] = useState<EntityState>(EMPTY_STATE);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const supabase = cloud ? getBrowserClient() : null;
  const supabaseRef = useRef(supabase);
  const userIdRef = useRef(userId);
  // Keep refs current for the stable put/del/setSettings callbacks. Updated in
  // an effect (never during render) so reads stay pure.
  useEffect(() => {
    supabaseRef.current = supabase;
    userIdRef.current = userId;
  });

  // ---- Load ----------------------------------------------------------------
  useEffect(() => {
    let active = true;
    setStatus("loading");
    const key = snapshotKey(userId);

    async function load() {
      // Instant paint from cache.
      const cached = loadSnapshot(key);
      if (cached && active) {
        setData(cached.state);
        setSettingsState(cached.settings);
      }

      let next = cached ?? { state: EMPTY_STATE, settings: DEFAULT_SETTINGS };

      if (cloud && supabaseRef.current && userId) {
        try {
          next = await fetchAll(supabaseRef.current, userId);
        } catch (err) {
          console.error("Failed to load cloud data", err);
        }
      }

      if (!active) return;

      // Daily carryover of incomplete tasks.
      const { tasks, changed } = carryOverTasks(next.state.tasks);
      const finalState = { ...next.state, tasks };
      setData(finalState);
      setSettingsState(next.settings);
      setStatus("ready");

      if (changed.length && cloud && supabaseRef.current && userId) {
        const rows = changed.map((t) => ({
          ...ENTITIES.tasks.toRow(t),
          user_id: userId,
        }));
        void supabaseRef.current.from("tasks").upsert(rows);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [cloud, userId]);

  // ---- Persist snapshot (debounced) ---------------------------------------
  useEffect(() => {
    if (status !== "ready" || typeof window === "undefined") return;
    const key = snapshotKey(userId);
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ state: data, settings }),
        );
      } catch {
        // storage full / unavailable — ignore
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [data, settings, status, userId]);

  // ---- Mutators ------------------------------------------------------------
  const put = useCallback<AppDataValue["put"]>((key, items) => {
    if (items.length === 0) return;
    setData((prev) => ({
      ...prev,
      [key]: upsertMany(prev[key] as HasId[], items as HasId[]),
    }));
    const sb = supabaseRef.current;
    const uid = userIdRef.current;
    if (sb && uid) {
      const { table, toRow } = ENTITIES[key];
      const rows = items.map((item) => ({ ...toRow(item), user_id: uid }));
      void sb
        .from(table)
        .upsert(rows)
        .then(({ error }) => {
          if (error) console.error(`upsert ${table} failed`, error);
        });
    }
  }, []);

  const del = useCallback<AppDataValue["del"]>((key, ids) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setData((prev) => ({
      ...prev,
      [key]: (prev[key] as HasId[]).filter((row) => !idSet.has(row.id)),
    }));
    const sb = supabaseRef.current;
    const uid = userIdRef.current;
    if (sb && uid) {
      const { table } = ENTITIES[key];
      void sb
        .from(table)
        .delete()
        .in("id", ids)
        .then(({ error }) => {
          if (error) console.error(`delete ${table} failed`, error);
        });
    }
  }, []);

  const setSettings = useCallback<AppDataValue["setSettings"]>((patch) => {
    setSettingsState((prev) => {
      const nextSettings = { ...prev, ...patch };
      const sb = supabaseRef.current;
      const uid = userIdRef.current;
      if (sb && uid) {
        void sb
          .from("profiles")
          .upsert({ id: uid, settings: nextSettings })
          .then(({ error }) => {
            if (error) console.error("settings upsert failed", error);
          });
      }
      return nextSettings;
    });
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({ ...data, status, settings, put, del, setSettings }),
    [data, status, settings, put, del, setSettings],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
