/**
 * Make every video in memory_media web-friendly:
 *   - a poster frame (thumb_key) so cards render without touching the video
 *   - a 720p H.264/AAC faststart rendition (web_key) for playback
 * Originals are never modified. Safe to re-run: only missing pieces are made.
 *
 *   npm run backfill-video
 *   npm run backfill-video -- --dry
 *
 * Needs R2_* and SUPABASE_SERVICE_ROLE_KEY in .env.local / .env.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const POSTER_EDGE = 1600;
const POSTER_SUFFIX = `-thumb-${POSTER_EDGE}.jpg`;
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const dry = process.argv.includes("--dry");

const need = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) { console.error("Missing env:", missing.join(", ")); process.exit(1); }
if (!ffmpegPath) { console.error("ffmpeg-static did not provide a binary for this platform"); process.exit(1); }

const s3 = new S3Client({
  region: "auto", endpoint: process.env.R2_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const bucket = process.env.R2_BUCKET!;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ffmpeg = (args: string[]) => run(ffmpegPath as string, ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });

async function main() {
  const { data: rows, error } = await sb.from("memory_media").select("id, key, thumb_key, web_key, size").eq("kind", "video");
  if (error) throw error;
  const todo = (rows ?? []).filter((r) => r.key && !r.key.startsWith("local:") && (!(r.thumb_key ?? "").endsWith(POSTER_SUFFIX) || !r.web_key));
  console.log(`${todo.length} videos need work${dry ? " (dry run)" : ""}`);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "daily-video-"));
  let done = 0, failed = 0;
  for (const r of todo) {
    const base = r.key.replace(/\.[^./]+$/, "");
    const name = r.key.split("/").pop();
    if (dry) { console.log(`  would process ${name}: ${(r.thumb_key ?? "").endsWith(POSTER_SUFFIX) ? "" : "poster "}${r.web_key ? "" : "rendition"}`); continue; }
    const src = path.join(tmp, "src");
    try {
      process.stdout.write(`  ${name} (${(r.size / 1048576).toFixed(1)} MB): download… `);
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: r.key }));
      await fs.writeFile(src, Buffer.from(await obj.Body!.transformToByteArray()));
      const patch: Record<string, string> = {};

      if (!(r.thumb_key ?? "").endsWith(POSTER_SUFFIX)) {
        process.stdout.write("poster… ");
        const poster = path.join(tmp, "poster.jpg");
        await ffmpeg(["-ss", "0.5", "-i", src, "-frames:v", "1", "-vf", `scale='min(${POSTER_EDGE},iw)':-2`, "-q:v", "4", poster]);
        const thumbKey = `${base}${POSTER_SUFFIX}`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: await fs.readFile(poster), ContentType: "image/jpeg" }));
        patch.thumb_key = thumbKey;
        if (r.thumb_key) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r.thumb_key })).catch(() => {});
      }

      if (!r.web_key) {
        process.stdout.write("encode 720p… ");
        const out = path.join(tmp, "web.mp4");
        await ffmpeg([
          "-i", src,
          "-map", "0:v:0", "-map", "0:a:0?",
          "-vf", "scale='min(720,iw)':-2",
          "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "2.5M", "-bufsize", "5M",
          "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
          "-c:a", "aac", "-b:a", "128k", "-ac", "2",
          "-movflags", "+faststart",
          out,
        ]);
        const body = await fs.readFile(out);
        const webKey = `${base}-web.mp4`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: webKey, Body: body, ContentType: "video/mp4" }));
        patch.web_key = webKey;
        process.stdout.write(`${(body.length / 1048576).toFixed(1)} MB… `);
      }

      const { error: upErr } = await sb.from("memory_media").update(patch).eq("id", r.id);
      if (upErr) throw upErr;
      done += 1;
      console.log("ok");
    } catch (err) {
      failed += 1;
      console.log("FAILED:", err instanceof Error ? err.message.split("\n")[0] : err);
    }
  }
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`Done: ${done} videos processed, ${failed} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
