import { syncRegistry } from "@compify/shared/server";

const dryRun = process.argv.includes("--dry-run");

const result = syncRegistry({ write: !dryRun });

console.log(dryRun ? "Dry run — no files written.\n" : "Registry synced.\n");
console.log(`Root: ${result.root}`);
console.log(`Components: ${result.slugs.length}`);
if (result.created.length) console.log(`Created: ${result.created.join(", ")}`);
if (result.updated.length) console.log(`Updated controls: ${result.updated.join(", ")}`);
if (result.warnings.length) {
  console.log("\nWarnings:");
  for (const warning of result.warnings) console.log(`  - ${warning}`);
}

console.log("\nWhat was automated:");
console.log("  • tweakSchema + props  ← parsed from addPropertyControls");
console.log("  • index.ts             ← generated from component files");
console.log("\nStill manual (optional .meta.json sidecar per component):");
console.log("  • displayName, category, description, tags, previewAccent");
