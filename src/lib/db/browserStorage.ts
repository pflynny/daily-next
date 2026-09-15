import { EMPTY_STATE, STATE_KEYS } from "./entities";
import { DEFAULT_SETTINGS } from "../../types";
import type { Snapshot } from "./syncStore";

export const SNAPSHOT_PREFIX = "daily-next:v1:";
export const snapshotKey = (userId: string | null) => `${SNAPSHOT_PREFIX}${userId ?? "guest"}`;

export function readSnapshot(key: string): Snapshot | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  const state = { ...EMPTY_STATE };
  for (const name of STATE_KEYS) {
    if (Array.isArray(parsed.state?.[name])) {
      Object.assign(state, { [name]: parsed.state[name] });
    }
  }
  return { state, settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    pending: Array.isArray(parsed.pending) ? parsed.pending : [],
    verified: parsed.verified === true };
}

/** Remove acknowledged account snapshots; never silently discard an outbox. */
export function clearAccountSnapshot(userId: string) {
  const key = snapshotKey(userId);
  const snapshot = readSnapshot(key);
  if (snapshot?.pending.length) {
    throw new Error("Unsaved changes remain on this device. Please retry sync before signing out.");
  }
  window.localStorage.removeItem(key);
}

export async function clearPrivateMediaCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("daily-media-")).map((key) => caches.delete(key)));
}

/** Tell the service worker which signed-in account owns this tab's media cache. */
export async function setPrivateMediaCacheUser(userId: string | null) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller ?? registration.active;
    if (!worker) return;
    await new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(finish, 2500);
      function finish() {
        window.clearTimeout(timeout);
        channel.port1.close();
        channel.port2.close();
        resolve();
      }
      channel.port1.onmessage = finish;
      worker.postMessage({ type: "MEDIA_SESSION", userId }, [channel.port2]);
    });
  } catch {
    // Media caching is an optimization; network requests remain authenticated.
  }
}
