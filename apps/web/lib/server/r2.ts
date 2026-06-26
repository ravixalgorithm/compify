import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3-compatible) client for thumbnail media (gallery/variant
 * images + videos). Server-only — uses the R2 access key/secret. Objects are
 * served publicly via R2_PUBLIC_URL (the bucket's r2.dev URL or a custom domain),
 * so the stored URL is just `${R2_PUBLIC_URL}/${key}`.
 *
 * Required env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 */
function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Configure Cloudflare R2 in apps/web/.env.local (and Vercel): ` +
        "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.",
    );
  }
  return v;
}

/** True when R2 is configured (so callers can guard / surface a clear error). */
export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

let client: S3Client | null = null;
function r2(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

/** Public URL for a key, derived from R2_PUBLIC_URL (no trailing slash). */
export function r2PublicUrl(key: string): string {
  return `${env("R2_PUBLIC_URL").replace(/\/+$/, "")}/${key}`;
}

/**
 * Extract the R2 object key from a stored public URL — returns null if the URL
 * isn't on our R2 host (e.g. a legacy Supabase Storage URL), so cleanup never
 * touches the wrong store. Drops any `?v=` cache-bust query.
 */
export function r2KeyFromUrl(url: string | null | undefined): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!url || !base) return null;
  try {
    if (new URL(url).host !== new URL(base).host) return null;
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, "")) || null;
  } catch {
    return null;
  }
}

/** Upload bytes to R2 and return the public URL (caller adds any cache-bust). */
export async function uploadToR2(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  await r2().send(
    new PutObjectCommand({
      Bucket: env("R2_BUCKET"),
      Key: key,
      Body: bytes,
      ContentType: contentType,
      // Immutable long cache: the public URL is cache-busted with `?v=<token>`
      // on every save, so the browser can cache the media forever and refreshes
      // are instant instead of re-downloading the image/video each time.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return r2PublicUrl(key);
}

/** Best-effort delete of an object by key (ignores missing). */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await r2().send(new DeleteObjectCommand({ Bucket: env("R2_BUCKET"), Key: key }));
  } catch {
    /* best-effort */
  }
}
