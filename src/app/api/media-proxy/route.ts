import { NextResponse } from "next/server";

/**
 * Same-origin proxy for the R2 public bucket, used by the Wrapped image
 * export: the capture library must fetch every image, and the bucket's
 * CORS policy blocks direct cross-origin GETs. Restricted to the
 * configured public host so it can't be used to fetch arbitrary URLs.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  const host = (process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (!host || target.hostname !== host || target.protocol !== "https:") {
    return new NextResponse("forbidden", { status: 403 });
  }

  const upstream = await fetch(target, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("upstream error", { status: 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
