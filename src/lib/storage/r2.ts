import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage adapter (S3-compatible).
 * This file is the single seam for the media provider — swap it to move
 * to a different bucket/provider without touching the rest of the app.
 */

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicHost: string;
}

function readConfig(): R2Config | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicHost) {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicHost };
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

export function publicUrl(key: string): string {
  const config = readConfig();
  // Tolerate either "pub-xxx.r2.dev" or "https://pub-xxx.r2.dev/" in the env.
  const host = (config?.publicHost ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return `https://${host}/${key}`;
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
  return { uploadUrl, publicUrl: publicUrl(key) };
}

export async function deleteObject(key: string): Promise<void> {
  const config = readConfig();
  if (!config) return;
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
