/**
 * One-off: generate ~800px JPEG thumbnails for every existing photo in
 * memory_media that doesn't have one, upload them to R2 next to the
 * original (`<key-without-ext>-thumb.jpg`) and record thumb_key.
 *
 *   npm run backfill-thumbs            # all users
 *   npm run backfill-thumbs -- --dry   # report only
 *
 * Needs R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local / .env
 * (pull with `npx vercel env pull .env.local --environment=production`).
 */
import { config } from "dotenv";
// `vercel env pull` writes .env.local; fall back to .env for anything else.
config({ path: ".env.local" });
config({ path: ".env" });
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const THUMB_EDGE = 1600;
const SUFFIX = `-thumb-${THUMB_EDGE}.jpg`;
const dry = process.argv.includes("--dry");

const need = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env:", missing.join(", "));
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const bucket = process.env.R2_BUCKET!;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: rows, error } = await sb
    .from("memory_media")
    .select("id, key, kind, size, width, height, thumb_key")
    .eq("kind", "image");
  if (error) throw error;
  // Missing, or made at an older size (different suffix) → (re)generate.
  const todo = (rows ?? []).filter((r) => r.key && !r.key.startsWith("local:") && !(r.thumb_key ?? "").endsWith(SUFFIX));
  console.log(`${todo.length} photos need a ${THUMB_EDGE}px thumbnail${dry ? " (dry run)" : ""}`);

  let done = 0, failed = 0, bytesIn = 0, bytesOut = 0;
  for (const r of todo) {
    const thumbKey = `${r.key.replace(/\.[^./]+$/, "")}${SUFFIX}`;
    try {
      if (dry) { console.log(`  would create ${thumbKey}`); continue; }
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: r.key }));
      const input = Buffer.from(await obj.Body!.transformToByteArray());
      bytesIn += input.length;
      const out = await sharp(input, { failOn: "none" })
        .rotate() // honour EXIF orientation
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      bytesOut += out.length;
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: out, ContentType: "image/jpeg" }));
      const { error: upErr } = await sb.from("memory_media").update({ thumb_key: thumbKey }).eq("id", r.id);
      if (upErr) throw upErr;
      // Old-size thumbnail is no longer referenced (caches keyed by URL stay valid).
      if (r.thumb_key && r.thumb_key !== thumbKey) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r.thumb_key })).catch(() => {});
      }
      done += 1;
      process.stdout.write(`\r  ${done}/${todo.length}  ${(bytesIn / 1048576).toFixed(0)} MB → ${(bytesOut / 1048576).toFixed(1)} MB`);
    } catch (err) {
      failed += 1;
      console.error(`\n  failed ${r.key}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`\nDone: ${done} thumbnails, ${failed} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
