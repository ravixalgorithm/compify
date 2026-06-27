// End-to-end smoke test of the DB-backed write path against the LIVE Supabase
// project, using the service-role key from apps/web/.env.local. Exercises the
// same operations as POST/DELETE /api/admin/components (minus the cookie gate):
// compile -> upload module to Storage -> upsert row -> fetch public URL ->
// delete row + storage cleanup. Uses a throwaway slug and removes it after.
//
// Run: pnpm tsx scripts/test-write-path.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { compileComponent } from "../apps/web/lib/server/compile-component.ts";
import { deriveComponentRow } from "../apps/web/lib/server/component-row.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "e2e-test-button";
const MODULES = "component-modules";

// Load the two needed vars from .env.local without printing them.
function loadEnv() {
  const text = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: [string, boolean][] = [];

  // 1. Compile
  const source = readFileSync(resolve(root, "packages/library/src/components/shiny-button.tsx"), "utf8");
  const compiled = await compileComponent({ source, slug: SLUG });
  checks.push(["compile ok", compiled.ok]);
  if (!compiled.ok) { report(checks); return; }

  // 2. Upload module
  const modulePath = `${SLUG}/${compiled.hash}.mjs`;
  const up = await db.storage.from(MODULES).upload(modulePath, compiled.code, {
    contentType: "application/javascript", upsert: true,
  });
  checks.push(["module upload", !up.error]);
  const moduleUrl = db.storage.from(MODULES).getPublicUrl(modulePath).data.publicUrl;

  // 3. Upsert row
  const row = deriveComponentRow({
    slug: SLUG, source, displayName: "E2E Test Button", category: "cards" as never,
    description: "", descriptionParagraphs: [], keyFeatures: [], tags: ["test"], related: [],
    previewAccent: "#7C3AED", featured: false,
  });
  const upsert = await db.from("components").upsert({
    ...row,
    compiled_module_url: moduleUrl,
    compiled_module_hash: compiled.hash,
    compile_status: "ready",
    status: "published",
    published_at: new Date().toISOString(),
  }, { onConflict: "slug" }).select("id, slug, status, compiled_module_url, tweak_schema").single();
  checks.push(["row upsert", !upsert.error && upsert.data?.slug === SLUG]);
  if (upsert.error) console.log("   upsert error:", upsert.error.message);
  const tweakCount = Array.isArray(upsert.data?.tweak_schema) ? upsert.data!.tweak_schema.length : 0;
  checks.push(["tweak_schema derived from source", tweakCount > 0]);

  // 4. Fetch the public module over HTTP
  const res = await fetch(moduleUrl);
  const body = res.ok ? await res.text() : "";
  checks.push(["public module fetch 200", res.ok]);
  checks.push(["module reads host global", body.includes("__compifyGlobals")]);

  // 5. Read back via published-only path (anon would see it; service-role sees all)
  const readBack = await db.from("components").select("slug, status").eq("slug", SLUG).single();
  checks.push(["row readable", !readBack.error && readBack.data?.status === "published"]);

  // 6. Delete + storage cleanup
  const del = await db.from("components").delete().eq("slug", SLUG);
  checks.push(["row delete", !del.error]);
  const list = await db.storage.from(MODULES).list(SLUG);
  if (list.data?.length) await db.storage.from(MODULES).remove(list.data.map((f) => `${SLUG}/${f.name}`));
  const gone = await db.from("components").select("slug").eq("slug", SLUG).maybeSingle();
  checks.push(["row gone after delete", gone.data === null]);

  report(checks);
}

function report(checks: [string, boolean][]) {
  console.log("");
  for (const [name, ok] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
  const allOk = checks.every(([, ok]) => ok);
  console.log(`\nRESULT: ${allOk ? "PASS" : "FAIL"}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
