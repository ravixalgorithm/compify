// Quick read-only verification of the migrated components table.
// Run: pnpm tsx scripts/verify-db.ts
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
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db
    .from("components")
    .select("slug, status, compile_status, compiled_module_url, thumbnail_url, framer_module_url")
    .order("slug");
  if (error) { console.error(error.message); process.exit(1); }

  const rows = data ?? [];
  console.log(`rows: ${rows.length}`);
  const missingModule = rows.filter((r) => !r.compiled_module_url).map((r) => r.slug);
  const notPublished = rows.filter((r) => r.status !== "published").map((r) => r.slug);
  const notReady = rows.filter((r) => r.compile_status !== "ready").map((r) => r.slug);
  console.log(`published: ${rows.length - notPublished.length}/${rows.length}  compile_ready: ${rows.length - notReady.length}/${rows.length}`);
  console.log(`missing module url: ${missingModule.length ? missingModule.join(", ") : "none"}`);

  // Spot-fetch one module from Storage.
  const sample = rows.find((r) => r.slug === "lightning") ?? rows[0];
  const res = await fetch(sample.compiled_module_url!);
  const body = res.ok ? await res.text() : "";
  console.log(`fetch ${sample.slug} module: HTTP ${res.status}  ${(body.length / 1024).toFixed(1)}KB  host-global=${body.includes("__compifyGlobals") ? "yes" : "NO"}`);

  const ok = rows.length === 10 && !missingModule.length && !notPublished.length && !notReady.length && res.ok;
  console.log(`\nRESULT: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
