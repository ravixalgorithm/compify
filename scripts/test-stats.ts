// Verifies the view/copy stat RPCs work against the live DB.
// Run: pnpm tsx scripts/test-stats.ts
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
  // Use the ANON/publishable key to mimic the browser path the app actually uses.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const slug = "lightning";
  const view = await db.rpc("increment_view", { p_slug: slug });
  console.log("increment_view:", view.error ? `ERROR ${view.error.message}` : JSON.stringify(view.data));
  const copy = await db.rpc("increment_copy", { p_slug: slug });
  console.log("increment_copy:", copy.error ? `ERROR ${copy.error.message}` : JSON.stringify(copy.data));

  const { data, error } = await db.from("component_stats").select("*").order("copies", { ascending: false });
  console.log("\ncomponent_stats rows:", error ? `ERROR ${error.message}` : "");
  for (const r of data ?? []) console.log(`  ${String(r.slug).padEnd(22)} views=${r.views} copies=${r.copies}`);

  const ok = !view.error && !copy.error;
  console.log(`\nRESULT: ${ok ? "PASS (RPCs work, numbers persist)" : "FAIL"}`);
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
