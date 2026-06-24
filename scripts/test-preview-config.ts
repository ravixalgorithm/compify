// Verifies per-surface preview overrides actually change the frame config that
// drives rendering on the platform. Run: pnpm tsx scripts/test-preview-config.ts
import { previewSurfaceConfig } from "../apps/web/lib/preview.ts";

const checks: [string, boolean][] = [];

// No override -> base config unchanged (lightning detail fills with an aspect).
const base = previewSurfaceConfig("lightning", "detail");
checks.push(["base lightning detail fills", base.fill === true]);

// fit=center -> centered, not filled, aspect ratio cleared (natural size).
const centered = previewSurfaceConfig("lightning", "detail", { fit: "center" });
checks.push(["center -> center true", centered.center === true]);
checks.push(["center -> fill false", centered.fill === false]);
checks.push(["center -> aspectRatio cleared", centered.aspectRatio === undefined]);

// fit=fill on an unknown component -> fills.
const filled = previewSurfaceConfig("brand-new-comp", "gallery", { fit: "fill" });
checks.push(["fill -> fill true", filled.fill === true]);

// minHeight override applies.
const minH = previewSurfaceConfig("brand-new-comp", "detail", { fit: "center", minHeight: 420 });
checks.push(["minHeight applied", minH.minHeight === 420]);

// fit=auto is a no-op (keeps base).
const auto = previewSurfaceConfig("lightning", "detail", { fit: "auto" });
checks.push(["auto -> unchanged (still fills)", auto.fill === true]);

console.log("");
for (const [n, ok] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}`);
const allOk = checks.every(([, ok]) => ok);
console.log(`\nRESULT: ${allOk ? "PASS" : "FAIL"}`);
process.exit(allOk ? 0 : 1);
