// Diagnose which components render and which fail. Lists every row, checks the
// module fetches, and re-runs the compiler on each source to surface errors.
// Run: pnpm tsx scripts/diagnose-components.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { compileComponent } from "../apps/web/lib/server/compile-component.ts";

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
    .select("slug, status, compile_status, compiled_module_url, dependencies, source")
    .order("created_at");
  if (error) { console.error(error.message); process.exit(1); }

  const rows = data ?? [];
  console.log(`\n${rows.length} components:\n`);

  for (const r of rows) {
    const issues: string[] = [];

    // Non-react/framer imports the source pulls in (must be bundlable).
    const imports = [...(r.source ?? "").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    const bare = imports.filter((i) => !i.startsWith(".") && !i.startsWith("/"));
    const nonShared = bare.filter(
      (i) => !/^(react|react-dom|react\/jsx-runtime|framer|framer-motion)$/.test(i),
    );
    const urlImports = imports.filter((i) => i.startsWith("http"));

    // Does the stored module fetch?
    let fetchStatus = "no-url";
    if (r.compiled_module_url) {
      try {
        const res = await fetch(r.compiled_module_url);
        fetchStatus = `${res.status}`;
        if (!res.ok) issues.push(`module fetch ${res.status}`);
      } catch (e) {
        fetchStatus = "ERR";
        issues.push(`module fetch threw`);
      }
    } else {
      issues.push("no module url");
    }

    // Recompile the source now to catch errors.
    let compileMsg = "ok";
    const compiled = await compileComponent({ source: r.source ?? "", slug: r.slug });
    if (!compiled.ok) {
      compileMsg = "FAIL";
      issues.push(`recompile: ${compiled.error.split("\n")[0]}`);
    }

    if (r.compile_status !== "ready") issues.push(`compile_status=${r.compile_status}`);
    if (r.status !== "published") issues.push(`status=${r.status}`);

    const flag = issues.length ? "❌" : "✅";
    console.log(`${flag} ${r.slug.padEnd(24)} fetch=${fetchStatus} compile=${compileMsg}`);
    if (nonShared.length) console.log(`     extra deps bundled: ${nonShared.join(", ")}`);
    if (urlImports.length) console.log(`     URL imports: ${urlImports.join(", ")}`);
    if (issues.length) console.log(`     issues: ${issues.join(" | ")}`);
  }
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
