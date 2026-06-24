// Verifies the MCP server's DB-backed data layer reads the live components
// table (list_components + get_component sources). Run: pnpm tsx scripts/test-mcp-db.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { listComponents, getComponent } from "../packages/mcp-server/src/registry-source.ts";

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
  const checks: [string, boolean][] = [];

  const list = await listComponents();
  checks.push(["list_components returns 10", list.length === 10]);
  checks.push(["list entries have name+category", list.every((c) => c.name && c.category)]);

  const lightning = await getComponent("lightning");
  checks.push(["get_component(lightning) found", Boolean(lightning)]);
  checks.push(["lightning source is raw tsx", Boolean(lightning?.source.includes("export default"))]);
  console.log(`  lightning: ${lightning?.entry.displayName}, source ${lightning?.source.length ?? 0} chars, deps=[${lightning?.entry.dependencies.join(",")}]`);

  const missing = await getComponent("does-not-exist");
  checks.push(["get_component(missing) -> undefined", missing === undefined]);

  console.log("");
  for (const [n, ok] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}`);
  const allOk = checks.every(([, ok]) => ok);
  console.log(`\nRESULT: ${allOk ? "PASS" : "FAIL"}`);
  process.exit(allOk ? 0 : 1);
}
main().catch((e) => { console.error("THREW:", e?.message ?? e); process.exit(1); });
