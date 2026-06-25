// Verifies Cloudflare R2 is wired correctly: checks env, uploads a tiny test
// object, fetches it over the public URL, then deletes it.
// Run: pnpm --filter @compify/web exec tsx ../../scripts/test-r2.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const text = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    console.log("MISSING env:", missing.join(", "));
    return;
  }
  const accountId = process.env.R2_ACCOUNT_ID!;
  const bucket = process.env.R2_BUCKET!;
  const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");
  console.log("account id:", accountId.slice(0, 6) + "…");
  console.log("bucket:    ", bucket);
  console.log("public url:", publicBase);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const token = Date.now().toString(36);
  const key = "r2-verify.txt";
  const body = `ok-${token}`;

  // 1. Upload (validates credentials + bucket + endpoint).
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "text/plain" }));
    console.log("\nupload:     OK");
  } catch (e) {
    console.log("\nupload:     FAIL —", e instanceof Error ? e.message : e);
    console.log("→ check R2_ACCOUNT_ID / keys / R2_BUCKET");
    return;
  }

  // 2. Fetch over the public URL (validates public access + R2_PUBLIC_URL).
  const url = `${publicBase}/${key}?ts=${token}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    if (res.ok && text.trim() === body) {
      console.log("public GET: OK  (", url, ")");
    } else {
      console.log(`public GET: FAIL — status ${res.status}, body "${text.slice(0, 60)}"`);
      console.log("→ enable public access on the bucket and check R2_PUBLIC_URL is the public base");
    }
  } catch (e) {
    console.log("public GET: FAIL —", e instanceof Error ? e.message : e);
    console.log("→ check R2_PUBLIC_URL");
  }

  // 3. Clean up.
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
  console.log("cleanup:    done");
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
