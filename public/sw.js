/* Daily service worker — offline shell + runtime caching. */
const CACHE = "daily-v3";
const MEDIA_CACHE_PREFIX = "daily-media-v2-";
const MEDIA_SESSION_CACHE = "daily-media-sessions-v1";
const MEDIA_MAX_BYTES = 256 * 1024 * 1024;
const MEDIA_MAX_ENTRY = 32 * 1024 * 1024;
const VIDEO_CHUNK_BYTES = 8 * 1024 * 1024;
const mediaPartitions = new Map();
const SHELL = [
  "/",
  "/goals",
  "/year",
  "/memories",
  "/wrapped",
  "/settings",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
        keys
          .filter((k) => k !== CACHE && !k.startsWith(MEDIA_CACHE_PREFIX))
          .map((k) => caches.delete(k)),
      ),
      ),
  );
  self.clients.claim();
});

async function partitionFor(userId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return MEDIA_CACHE_PREFIX + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "MEDIA_SESSION" || !event.source?.id) return;
  const id = event.source.id;
  const update = (async () => {
    const previous = await accountForClient(id);
    const userId = typeof event.data.userId === "string" && /^[\w-]{1,128}$/.test(event.data.userId) ? event.data.userId : null;
    const next = userId ? await partitionFor(userId) : null;
    if (next) {
      mediaPartitions.set(id, next);
      const sessions = await caches.open(MEDIA_SESSION_CACHE);
      await sessions.put(sessionKey(id), new Response(next));
    } else {
      mediaPartitions.delete(id);
      const sessions = await caches.open(MEDIA_SESSION_CACHE);
      await sessions.delete(sessionKey(id));
      await clearPrivateMediaCaches();
    }
    if (previous && previous !== next) await caches.delete(previous);
  })();
  event.waitUntil(update.then(() => event.ports[0]?.postMessage({ type: "MEDIA_SESSION_READY" })));
});

function sessionKey(clientId) {
  return new Request(`${self.location.origin}/__daily_media_session__/${encodeURIComponent(clientId)}`);
}

async function accountForClient(clientId) {
  const existing = mediaPartitions.get(clientId);
  if (existing) return existing;
  const sessions = await caches.open(MEDIA_SESSION_CACHE);
  const response = await sessions.match(sessionKey(clientId));
  const partition = response && await response.text();
  if (partition && /^daily-media-v2-[0-9a-f]{64}$/.test(partition)) {
    mediaPartitions.set(clientId, partition);
    return partition;
  }
  return null;
}

async function clearPrivateMediaCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith(MEDIA_CACHE_PREFIX) || name === MEDIA_SESSION_CACHE).map(name => caches.delete(name)));
}

function cacheKey(request, range) {
  const url = new URL(request.url);
  url.searchParams.set("__daily_media_cache", range ? `${range.start}-${range.end}` : "full");
  return new Request(url.href, { method: "GET", credentials: "same-origin" });
}

async function pruneMediaCache(cache, incomingBytes) {
  const keys = await cache.keys();
  const entries = await Promise.all(keys.map(async request => {
    const response = await cache.match(request);
    return { request, bytes: Number(response?.headers.get("content-length")) || 0 };
  }));
  let total = entries.reduce((n, entry) => n + entry.bytes, incomingBytes);
  for (const entry of entries) {
    if (total <= MEDIA_MAX_BYTES) break;
    await cache.delete(entry.request);
    total -= entry.bytes;
  }
}

async function cachedMediaResponse(cache, key, requestRange) {
  const response = await cache.match(key);
  if (!response) return null;
  const storedRange = response.headers.get("x-daily-media-range");
  const body = await response.arrayBuffer();
  if (!requestRange) return new Response(body, { status: 200, headers: response.headers });
  const match = /^bytes=(\d*)-(\d*)$/.exec(requestRange.trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;
  const total = Number(response.headers.get("x-daily-media-total")) || body.byteLength;
  if (start === null) {
    if (!end) return null;
    start = Math.max(0, total - end); end = total - 1;
  } else if (end === null) end = Math.min(total - 1, start + VIDEO_CHUNK_BYTES - 1);
  const range = storedRange?.match(/^(\d+)-(\d+)$/);
  const storedStart = range ? Number(range[1]) : 0;
  const storedEnd = range ? Number(range[2]) : body.byteLength - 1;
  if (end >= total && storedEnd === total - 1) end = total - 1;
  if (start < storedStart || end > storedEnd || start > end) return null;
  const headers = new Headers(response.headers);
  headers.delete("x-daily-media-range"); headers.delete("x-daily-media-total");
  headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(body.slice(start - storedStart, end - storedStart + 1), { status: 206, headers });
}

async function handlePrivateMedia(event, userId) {
  const { request } = event;
  const cache = await caches.open(userId);
  const requestedRange = request.headers.get("range");
  let bounds = null;
  if (requestedRange) {
    // Bound ranged media reads so large videos cache as reusable chunks.
    const start = /^bytes=(\d+)-/.exec(requestedRange)?.[1];
    const end = /-(\d+)$/.exec(requestedRange)?.[1];
    if (start !== undefined) {
      const rangeStart = Number(start);
      const requestedEnd = end === undefined ? rangeStart + VIDEO_CHUNK_BYTES - 1 : Number(end);
      if (!Number.isSafeInteger(rangeStart) || !Number.isSafeInteger(requestedEnd) || requestedEnd < rangeStart) return fetch(request, { cache: "no-store" });
      bounds = { start: rangeStart, end: Math.min(requestedEnd, rangeStart + VIDEO_CHUNK_BYTES - 1) };
    }
    // Suffix ranges need the object size before they can be safely normalized.
    else return fetch(request, { cache: "no-store" });
  }
  const range = bounds ? `bytes=${bounds.start}-${bounds.end}` : requestedRange;
  const key = cacheKey(request, bounds);
  const cached = await cachedMediaResponse(cache, key, range);
  if (cached) return cached;
  const headers = new Headers(request.headers);
  if (bounds) headers.set("range", `bytes=${bounds.start}-${bounds.end}`);
  const network = fetch(new Request(request, { headers, cache: "no-store" })).then(response => {
    const contentType = response.headers.get("content-type") ?? "";
    const length = Number(response.headers.get("content-length")) || 0;
    if ((response.status === 200 || response.status === 206) && /^(image|video)\//i.test(contentType) && length > 0 && length <= MEDIA_MAX_ENTRY) {
      const cleanHeaders = new Headers(response.headers);
      cleanHeaders.delete("vary"); cleanHeaders.delete("cache-control");
      cleanHeaders.delete("content-range");
      cleanHeaders.set("x-daily-media-total", response.headers.get("content-range")?.split("/")[1] ?? String(length));
      if (response.status === 206) {
        const contentRange = response.headers.get("content-range")?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        if (contentRange) cleanHeaders.set("x-daily-media-range", `${contentRange[1]}-${contentRange[2]}`);
      }
      const safe = new Response(response.clone().body, { status: 200, headers: cleanHeaders });
      event.waitUntil(pruneMediaCache(cache, length).then(() => cache.put(key, safe)).catch(() => {}));
    }
    return response;
  });
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave APIs (BTC, Supabase) alone

  if (url.pathname.startsWith("/api/media/")) {
    event.respondWith(accountForClient(event.clientId).then(userId =>
      userId ? handlePrivateMedia(event, userId) : fetch(request, { cache: "no-store" }),
    ));
    return;
  }

  // Never cache other API or auth responses.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Navigations: network-first, fall back to cached page, then the app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/")),
        ),
    );
    return;
  }

  // Static assets + fonts: cache-first with runtime fill.
  if (
    url.pathname.startsWith("/_next/") ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});

/* --- Push notifications (check-in reminders) --- */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Daily", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Daily", {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
