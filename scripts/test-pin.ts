// Diagnoses the admin "move to top" 500 by running the same DB ops the
// /api/admin/components/position route performs, with the service-role client.
// Run: pnpm tsx scripts/test-pin.ts
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

  // 1) Can we read the pin columns at all?
  const probe = await db
    .from("components")
    .select("slug, status, grid_column, sort_position")
    .limit(3);
  console.log("SELECT pin columns:", probe.error ? `ERROR ${probe.error.message}` : "ok");
  for (const r of probe.data ?? []) console.log("  ", JSON.stringify(r));

  if (probe.error) {
    console.log("\nRESULT: FAIL — pin columns are missing/unreadable. Apply the migration.");
    return;
  }

  // 2) Reproduce the route's select + update for a real slug, column 0.
  const slug = String(probe.data?.[0]?.slug ?? "");
  if (!slug) { console.log("No components found."); return; }

  const top = await db
    .from("components")
    .select("sort_position")
    .eq("grid_column", 0)
    .not("sort_position", "is", null)
    .order("sort_position", { ascending: true })
    .limit(1)
    .maybeSingle();
  console.log("\nSELECT top-of-column:", top.error ? `ERROR ${top.error.message}` : JSON.stringify(top.data));

  // Read-only: do NOT mutate prod. Just report whether the route's read path works.
  console.log(`\nRESULT: ${!top.error ? "PASS — pin columns readable; select path works" : "FAIL — see error above"}`);
  void slug;
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
