import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getObject } from "@/lib/storage/r2";

/**
 * Authenticated media serving for the private R2 bucket. Object keys are
 * `<userId>/<year>/<uuid>.<ext>`, so ownership is checked by requiring the
 * key to start with the caller's user id.
 */
export async function GET(
  _request: Request,
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

  const obj = await getObject(keyStr);
  if (!obj) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(obj.body, {
    headers: {
      "Content-Type": obj.contentType,
      ...(obj.contentLength
        ? { "Content-Length": String(obj.contentLength) }
        : {}),
      // Private: only the owner's browser may cache it.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
