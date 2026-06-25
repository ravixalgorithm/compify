// Read-only: reports the component-thumbnails bucket config (public flag,
// file size limit, allowed MIME types) so we can confirm video uploads work.
// Run: pnpm tsx scripts/check-bucket.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await db.storage.getBucket("component-thumbnails");
  if (error) {
    console.log("ERROR:", error.message);
    return;
  }
  console.log("bucket:           ", data.name);
  console.log("public:           ", data.public);
  console.log("file_size_limit:  ", data.file_size_limit ?? "(none / project default)");
  console.log("allowed_mime_types:", data.allowed_mime_types ?? "(any)");

  const allowed = data.allowed_mime_types as string[] | null;
  const videoOk =
    !allowed ||
    ["video/mp4", "video/webm", "video/quicktime"].some(
      (t) => allowed.includes(t) || allowed.includes("video/*"),
    );
  console.log("\nVIDEO ALLOWED:", videoOk ? "YES" : "NO — add video MIME types");
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
