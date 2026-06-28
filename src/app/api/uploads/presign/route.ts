import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { createPresignedUpload, isStorageConfigured } from "@/lib/storage/r2";
import { newId } from "@/lib/utils/id";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED = /^(image|video)\//;

export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
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

  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { filename, contentType, size } = body;
  if (!contentType || !ALLOWED.test(contentType)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (typeof size === "number" && size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const ext = (filename?.split(".").pop() ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const year = new Date().getFullYear();
  const key = `${user.id}/${year}/${newId()}${ext ? `.${ext}` : ""}`;

  const presigned = await createPresignedUpload(key, contentType);
  if (!presigned) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  }

  return NextResponse.json({ key, ...presigned });
}
