// Phase 6 — migrate the filesystem component library into the DB-backed store.
// For each registry.json entry: compile its .tsx source to a runtime module,
// upload it to Storage, and upsert the components row (metadata mapped straight
// from registry.json so the DB matches exactly what the site shows today).
// Idempotent (upsert on slug). Does NOT change what the live site renders yet —
// that happens in Phase 4 when the loader is wired.
//
// Run: pnpm tsx scripts/migrate-components.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { compileComponent } from "../apps/web/lib/server/compile-component.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = "component-modules";

function loadEnv() {
  const text = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

type Entry = Record<string, any>;

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const registry: Entry[] = JSON.parse(readFileSync(resolve(root, "registry.json"), "utf8"));
  let ok = 0;
  const failures: string[] = [];

  for (const e of registry) {
    const slug = e.name as string;
    try {
      const source = readFileSync(resolve(root, e.sourcePath), "utf8");

      const compiled = await compileComponent({ source, slug });
      if (!compiled.ok) {
        failures.push(`${slug}: compile failed — ${compiled.error.split("\n")[0]}`);
        console.log(`  FAIL  ${slug}  (compile)`);
        continue;
      }

      const modulePath = `${slug}/${compiled.hash}.mjs`;
      const up = await db.storage.from(MODULES).upload(modulePath, compiled.code, {
        contentType: "application/javascript", upsert: true,
      });
      if (up.error) {
        failures.push(`${slug}: module upload — ${up.error.message}`);
        console.log(`  FAIL  ${slug}  (upload)`);
        continue;
      }
      const compiledModuleUrl = db.storage.from(MODULES).getPublicUrl(modulePath).data.publicUrl;

      const row = {
        slug,
        display_name: e.displayName ?? slug,
        category: e.category ?? "cards",
        description: e.description ?? "",
        description_paragraphs: e.descriptionParagraphs ?? [],
        key_features: e.keyFeatures ?? [],
        tags: e.tags ?? [],
        dependencies: e.dependencies ?? [],
        variants: e.variants ?? ["framer"],
        related: e.related ?? [],
        tweak_schema: e.tweakSchema ?? [],
        props: e.props ?? [],
        usage: e.usage ?? null,
        copy_count: e.copyCount ?? 0,
        source,
        compiled_module_url: compiledModuleUrl,
        compiled_module_hash: compiled.hash,
        compile_status: "ready",
        compile_error: null,
        thumbnail_url: e.thumbnail ?? null,
        framer_module_url: e.framerModuleUrl ?? null,
        preview_accent: e.previewAccent ?? "#7C3AED",
        // Legacy coarse layout lives under `mode`; per-surface admin overrides
        // (gallery/detail/variant) land alongside it later.
        preview_layout: { mode: e.previewLayout ?? null },
        status: "published",
        published_at: new Date().toISOString(),
      };

      const res = await db.from("components").upsert(row, { onConflict: "slug" }).select("slug").single();
      if (res.error) {
        failures.push(`${slug}: upsert — ${res.error.message}`);
        console.log(`  FAIL  ${slug}  (db: ${res.error.message})`);
        continue;
      }
      ok++;
      console.log(`  OK    ${slug.padEnd(20)} ${(compiled.bytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      failures.push(`${slug}: ${(err as Error).message}`);
      console.log(`  FAIL  ${slug}  (${(err as Error).message})`);
    }
  }

  console.log(`\nMigrated ${ok}/${registry.length}`);
  if (failures.length) {
    console.log("Failures:");
    for (const f of failures) console.log("  - " + f);
    process.exit(1);
  }
}

main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
