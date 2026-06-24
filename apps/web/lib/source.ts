import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RegistryEntry } from "@compify/shared";

/**
 * Locates the monorepo root by walking up from the Next working directory
 * until `registry.json` is found. Works for both `next dev` and `next build`.
 */
function repoRoot(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "..", ".."),
    resolve(process.cwd(), "..", "..", ".."),
  ];
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "registry.json"))) return dir;
  }
  return process.cwd();
}

/** Reads the raw `.tsx` source for a registry entry (server-side only). */
export function readSource(entry: RegistryEntry): string {
  try {
    return readFileSync(resolve(repoRoot(), entry.sourcePath), "utf8");
  } catch {
    return `// Source unavailable for ${entry.name}.`;
  }
}
