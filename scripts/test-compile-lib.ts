// Verifies apps/web/lib/server/compile-component.ts:
//  1. a real component (shiny-button) compiles, stays tiny, no React leak;
//  2. a broken source returns ok:false with a readable error (no crash).
// Run: pnpm tsx scripts/test-compile-lib.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compileComponent } from "../apps/web/lib/server/compile-component.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const goodSource = readFileSync(
    resolve(root, "packages/library/src/components/shiny-button.tsx"),
    "utf8",
  );

  const good = await compileComponent({ source: goodSource, slug: "shiny-button" });
  if (good.ok) {
    console.log(`[good] OK  ${(good.bytes / 1024).toFixed(1)} KB  hash=${good.hash}  warnings=${good.warnings.length}`);
    console.log(`[good] reads host global? ${good.code.includes("__compifyGlobals") ? "yes" : "NO"}`);
  } else {
    console.log(`[good] UNEXPECTED FAIL: ${good.error}`);
  }

  const broken = await compileComponent({
    source: `export default function Bad() { return <div>oops</div  // unterminated JSX + tag`,
    slug: "broken",
  });
  console.log(`[broken] ok=${broken.ok}  ${broken.ok ? "(should have failed!)" : "error => " + broken.error.split("\n")[0]}`);

  const passed = good.ok && good.bytes < 60_000 && good.code.includes("__compifyGlobals") && !broken.ok;
  console.log(`\nRESULT: ${passed ? "PASS" : "FAIL"}`);
  process.exit(passed ? 0 : 1);
}

main();
