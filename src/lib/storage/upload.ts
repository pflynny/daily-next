import type { MemoryMedia } from "@/types";

export type UploadedMedia = Pick<
  MemoryMedia,
  "kind" | "url" | "key" | "width" | "height" | "mime" | "size"
>;

const LOCAL_FALLBACK_LIMIT = 8 * 1024 * 1024; // 8 MB

const HEIC_EXT = /\.(heic|heif)$/i;

function isHeic(file: File): boolean {
  return /^image\/hei[cf]/.test(file.type) || HEIC_EXT.test(file.name);
}

/**
 * Re-encode a HEIC photo as JPEG so every browser can display it.
 * Decoding uses the browser's own image support — Safari (where iPhone
 * uploads come from) reads HEIC natively; browsers that can't get a
 * clear error instead of a broken image.
 */
async function heicToJpeg(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            "This browser can't read HEIC photos — upload from your iPhone, or convert to JPEG first.",
          ),
        );
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) throw new Error("Could not convert HEIC photo");
    return new File([blob], file.name.replace(HEIC_EXT, ".jpg"), {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
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

/**
 * Upload a media file. Uses Cloudflare R2 (via a presigned PUT) when storage
 * is configured and the user is signed in; otherwise falls back to an inline
 * data URL so the timeline still works offline / in guest mode.
 */
export async function uploadMedia(input: File): Promise<UploadedMedia> {
  const kind: "image" | "video" = input.type.startsWith("video")
    ? "video"
    : "image";
  const file = kind === "image" && isHeic(input) ? await heicToJpeg(input) : input;
  const dims =
    kind === "video" ? await getVideoSize(file) : await getImageSize(file);

  try {
    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (res.ok) {
      const { uploadUrl, publicUrl, key } = (await res.json()) as {
        uploadUrl: string;
        publicUrl: string;
        key: string;
      };
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error("Upload failed");
      return {
        kind,
        url: publicUrl,
        key,
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
    mime: file.type,
    size: file.size,
    ...dims,
  };
}
