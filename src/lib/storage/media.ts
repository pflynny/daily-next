import type { MemoryMedia } from "@/types";

/** Card/timeline image URL: the thumbnail (or video poster) when one
 *  exists, else the original. */
export function displayUrl(m: Pick<MemoryMedia, "url" | "thumbKey">): string {
  return m.thumbKey ? `/api/media/${m.thumbKey}` : m.url;
}

/** Video playback URL: the 720p web rendition when one exists, else the
 *  original (which may be HEVC and unplayable on some devices). */
export function playbackUrl(m: Pick<MemoryMedia, "url" | "webKey">): string {
  return m.webKey ? `/api/media/${m.webKey}` : m.url;
}
