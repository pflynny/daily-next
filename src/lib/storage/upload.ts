import type { MemoryMedia } from "@/types";

export type UploadedMedia = Pick<
  MemoryMedia,
  "kind" | "url" | "key" | "thumbKey" | "webKey" | "width" | "height" | "mime" | "size"
>;

const LOCAL_FALLBACK_LIMIT = 8 * 1024 * 1024; // 8 MB
const MAX_IMAGE_EDGE = 1800;
const THUMB_EDGE = 800;

const HEIC_EXT = /\.(heic|heif)$/i;

function isHeic(file: File): boolean {
  return /^image\/hei[cf]/.test(file.type) || HEIC_EXT.test(file.name);
}

/** Decode via the browser's own image support (works in Safari). */
async function decodeHeicNatively(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!img) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Re-encode a HEIC photo as JPEG so every browser can display it.
 * Safari decodes HEIC natively; Chrome/Android and others fall back to
 * a lazy-loaded wasm decoder (heic2any).
 */
async function heicToJpeg(file: File): Promise<File> {
  let blob = await decodeHeicNatively(file);
  if (!blob) {
    try {
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      blob = Array.isArray(out) ? out[0] : out;
    } catch {
      throw new Error(
        "Could not convert this HEIC photo — try saving it as JPEG first.",
      );
    }
  }
  return new File([blob], file.name.replace(HEIC_EXT, ".jpg"), {
    type: "image/jpeg",
  });
}

function getImageSize(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function getVideoSize(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Keep the timeline responsive by storing a display-sized JPEG, not the
 * original multi-megapixel camera file. */
async function optimiseImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const dimensions = await getImageSize(file);
  const width = dimensions.width ?? 0;
  const height = dimensions.height ?? 0;
  if (Math.max(width, height) <= MAX_IMAGE_EDGE) return file;
  const scale = MAX_IMAGE_EDGE / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not resize image"));
      element.src = url;
    });
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 1;
  }
}

/** Display-size JPEG for cards and the timeline (the original stays for
 *  the lightbox and film export). */
async function makeThumb(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");
  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!image) return null;
    const scale = Math.min(1, THUMB_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ? new File([blob], "thumb.jpg", { type: "image/jpeg" }) : null;
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 1;
  }
}

/** First-frame poster for a video so cards render without downloading
 *  any of the video. Returns null when the browser can't decode it. */
async function makePoster(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const ok = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 8000);
      video.onerror = () => { clearTimeout(timer); resolve(false); };
      video.onloadeddata = () => {
        // nudge past the first (often black) frame
        video.currentTime = Math.min(0.5, (video.duration || 1) / 4);
      };
      video.onseeked = () => { clearTimeout(timer); resolve(true); };
    });
    if (!ok || !video.videoWidth) return null;
    const scale = Math.min(1, THUMB_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 1;
  }
}

async function presignAndPut(file: File, variant?: "thumb"): Promise<{ key: string; publicUrl: string } | null> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, variant }),
  });
  if (!res.ok) return null;
  const { uploadUrl, publicUrl, key } = (await res.json()) as { uploadUrl: string; publicUrl: string; key: string };
  const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("Upload failed");
  return { key, publicUrl };
}

/**
 * Upload a media file. Uses Cloudflare R2 (via a presigned PUT) when storage
 * is configured and the user is signed in; otherwise falls back to an inline
 * data URL so the timeline still works offline / in guest mode.
 */
export async function uploadMedia(input: File): Promise<UploadedMedia> {
  const kind: "image" | "video" = input.type.startsWith("video")
    ? "video"
    : "image";
  const file = kind === "image"
    ? await optimiseImage(isHeic(input) ? await heicToJpeg(input) : input)
    : input;
  const dims =
    kind === "video" ? await getVideoSize(file) : await getImageSize(file);

  try {
    const main = await presignAndPut(file);
    if (main) {
      // Thumbnail/poster failures must never lose the upload itself.
      let thumbKey: string | null = null;
      try {
        const thumb = kind === "image" ? await makeThumb(file) : await makePoster(file);
        thumbKey = thumb ? (await presignAndPut(thumb, "thumb"))?.key ?? null : null;
      } catch {
        thumbKey = null;
      }
      return {
        kind,
        url: main.publicUrl,
        key: main.key,
        thumbKey,
        // 720p renditions are made by the Mac-side backfill (npm run backfill-video).
        webKey: null,
        mime: file.type,
        size: file.size,
        ...dims,
      };
    }
  } catch (err) {
    console.error("R2 upload failed, falling back to inline storage", err);
  }

  if (file.size > LOCAL_FALLBACK_LIMIT) {
    throw new Error(
      "Media uploads need Cloudflare R2 configured (file too large for local fallback).",
    );
  }
  const dataUrl = await readDataUrl(file);
  return {
    kind,
    url: dataUrl,
    key: `local:${file.name}`,
    thumbKey: null,
    webKey: null,
    mime: file.type,
    size: file.size,
    ...dims,
  };
}
