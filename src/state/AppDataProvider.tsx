"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { type EntityState, type StateKey } from "@/lib/db/entities";
import { SyncStore, type SyncView } from "@/lib/db/syncStore";
import { cloudAdapter } from "@/lib/db/cloud";
import { readSnapshot, snapshotKey } from "@/lib/db/browserStorage";
import { todayKey } from "@/lib/utils/date";
import type { AppSettings } from "@/types";

interface AppDataValue extends EntityState {
  status: "loading" | "ready";
  settings: AppSettings;
  sync: Pick<SyncView, "syncing" | "error" | "storageError" | "verified"> & { pending: number };
  put<K extends StateKey>(key: K, items: EntityState[K]): void;
  del(key: StateKey, ids: string[]): void;
  setSettings(patch: Partial<AppSettings>): void;
  retrySync(): Promise<void>;
  flush(): Promise<void>;
}
const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { cloud, user } = useAuth();
  const userId = cloud ? user?.id ?? null : null;
  return <AccountData key={userId ?? "guest"} userId={userId}>{children}</AccountData>;
}

function AccountData({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [store] = useState(() => {
    const key = snapshotKey(userId);
    const client = userId ? getBrowserClient() : null;
    return new SyncStore({
      read: () => readSnapshot(key),
      write: (snapshot) => window.localStorage.setItem(key, JSON.stringify(snapshot)),
      remote: client && userId ? cloudAdapter(client, userId) : undefined,
      lock: async <T,>(work: () => Promise<T>): Promise<T> => {
        if (!navigator.locks) return await work();
        return await navigator.locks.request(`daily-sync:${key}`, work);
      },
    });
  });
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    store.start();
    let day = todayKey();
    const refresh = () => { if (document.visibilityState === "visible") void store.sync(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== snapshotKey(userId)) return;
      if (event.newValue === null) store.stop();
      else store.receiveStorage();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (store.getSnapshot().storageError) { event.preventDefault(); event.returnValue = ""; }
    };
    const timer = window.setInterval(() => {
      if (todayKey() !== day) { day = todayKey(); refresh(); }
    }, 60_000);
    window.addEventListener("online", refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      store.stop();
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [store, userId]);

  const value = useMemo<AppDataValue>(() => ({
    ...snapshot.state, settings: snapshot.settings, status: snapshot.status,
    sync: { syncing: snapshot.syncing, error: snapshot.error, storageError: snapshot.storageError,
      verified: snapshot.verified, pending: snapshot.pending.length },
    put: store.put, del: store.del, setSettings: store.setSettings,
    retrySync: () => store.sync(), flush: store.flush,
  }), [snapshot, store]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used within AppDataProvider");
  return context;
}
