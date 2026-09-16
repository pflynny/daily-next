import type { MemoryMedia } from "@/types";

/** Card/timeline URL: the thumbnail when one exists, else the original. */
export function displayUrl(m: Pick<MemoryMedia, "url" | "thumbKey">): string {
  return m.thumbKey ? `/api/media/${m.thumbKey}` : m.url;
}
