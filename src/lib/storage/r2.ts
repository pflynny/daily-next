import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage adapter (S3-compatible).
 * This file is the single seam for the media provider — swap it to move
 * to a different bucket/provider without touching the rest of the app.
 *
 * The bucket is PRIVATE: objects are never served from a public host.
 * Media is streamed through /api/media/[...key], which authenticates the
 * user and checks the key belongs to them.
 */

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function readConfig(): R2Config | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

let client: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      // R2 needs path-style URLs: bucket-as-subdomain hosts
      // (bucket.account.r2.cloudflarestorage.com) don't resolve.
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

/** App-relative URL the browser uses; served by the authenticated media route. */
export function mediaUrl(key: string): string {
  return `/api/media/${key}`;
}

export async function createPresignedUpload(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const config = readConfig();
  if (!config) return null;
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getClient(config), command, {
    expiresIn: 600,
  });
  return { uploadUrl, publicUrl: mediaUrl(key) };
}

/** Fetch an object for streaming to an authenticated user. */
export async function getObject(key: string): Promise<{
  body: ReadableStream;
  contentType: string;
  contentLength?: number;
} | null> {
  const config = readConfig();
  if (!config) return null;
  try {
    const res = await getClient(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream() as ReadableStream,
      contentType: res.ContentType ?? "application/octet-stream",
      contentLength: res.ContentLength,
    };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const config = readConfig();
  if (!config) return;
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
