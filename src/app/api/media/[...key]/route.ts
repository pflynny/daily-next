import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createPresignedDownload, getObject } from "@/lib/storage/r2";

/**
 * Authenticated media serving for the private R2 bucket. Object keys are
 * `<userId>/<year>/<uuid>.<ext>`, so ownership is checked by requiring the
 * key to start with the caller's user id.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const keyStr = key.join("/");
  if (!keyStr || keyStr.includes("..")) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }

  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!keyStr.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Thumbnails are small and immutable: stream them same-origin so the
  // browser and service worker can cache them (a cross-origin redirect
  // would be opaque to the service worker and never cached).
  const isThumb = /-thumb(-\d+)?\.jpg$/.test(keyStr);

  // Send the browser directly to R2 for large media. The auth and ownership
  // checks above still run first, while the bytes no longer pass through
  // Vercel Compute (and therefore do not consume Fast Origin Transfer).
  const downloadUrl = isThumb ? null : await createPresignedDownload(keyStr);
  if (downloadUrl) {
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      // Private, short-lived: scrolling back doesn't re-run auth, while the
      // signed URL itself expires within the hour regardless.
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const obj = await getObject(keyStr, request.headers.get("range"));
  if (!obj) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(obj.body, {
    status: obj.status,
    headers: {
      "Content-Type": obj.contentType,
      "Accept-Ranges": "bytes",
      ...(obj.contentRange ? { "Content-Range": obj.contentRange } : {}),
      ...(obj.contentLength !== undefined
        ? { "Content-Length": String(obj.contentLength) }
        : {}),
      // Thumbnails have immutable keys → cache hard (per user/browser);
      // originals only reach this path when presigning is unavailable.
      "Cache-Control": isThumb ? "private, max-age=31536000, immutable" : "private, no-store",
      "Vary": "Cookie",
    },
  });
}
