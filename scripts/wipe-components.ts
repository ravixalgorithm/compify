// Wipes existing DB-backed components so you can re-upload fresh ones from the
// admin panel: deletes all rows in `components` and all thumbnail media under
// the `components/` prefix in Cloudflare R2.
//
// DRY RUN by default (just reports counts). Pass --confirm to actually delete.
//   pnpm --filter @compify/web exec tsx ../../scripts/wipe-components.ts
//   pnpm --filter @compify/web exec tsx ../../scripts/wipe-components.ts --confirm
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const text = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const CONFIRM = process.argv.includes("--confirm");

async function listR2(s3: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of out.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function main() {
  loadEnv();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const bucket = process.env.R2_BUCKET!;

  const { count } = await db.from("components").select("slug", { count: "exact", head: true });
  const r2keys = await listR2(s3, bucket, "components/");

  console.log(`DB components rows:        ${count ?? "?"}`);
  console.log(`R2 objects (components/):  ${r2keys.length}`);

  if (!CONFIRM) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --confirm to delete.");
    return;
  }

  console.log("\nDeleting…");
  const del = await db.from("components").delete().not("slug", "is", null);
  console.log("  DB rows:", del.error ? `ERROR ${del.error.message}` : "deleted");

  for (let i = 0; i < r2keys.length; i += 1000) {
    const batch = r2keys.slice(i, i + 1000).map((Key) => ({ Key }));
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch } }));
  }
  console.log(`  R2 objects: deleted ${r2keys.length}`);

  console.log("\nDone. Upload fresh components from the admin panel.");
}
main().catch((e) => {
  console.error("THREW:", e?.message ?? e);
  process.exit(1);
});
