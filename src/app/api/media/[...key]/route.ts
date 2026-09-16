import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
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

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth_unavailable" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!keyStr.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Send the browser directly to R2 for large media. The auth and ownership
  // checks above still run first, while the bytes no longer pass through
  // Vercel Compute (and therefore do not consume Fast Origin Transfer).
  const downloadUrl = await createPresignedDownload(keyStr);
  if (downloadUrl) {
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      // Do not cache the redirect: after sign-out, a browser must not reuse a
      // still-valid signed URL without passing the auth check again.
      headers: { "Cache-Control": "private, no-store" },
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
      // Authentication must be checked on every request, including after logout.
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
    },
  });
}
