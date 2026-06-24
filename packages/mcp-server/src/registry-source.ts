import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegistryEntry } from "@compify/shared/types";

const here = dirname(fileURLToPath(import.meta.url));

/** Locate registry.json in dev, Vercel serverless, or explicit override. */
export function resolveRepoRoot(): string {
  if (process.env.COMPIFY_REPO_ROOT) {
    return process.env.COMPIFY_REPO_ROOT;
  }

  const bundleRoot = resolve(here, "..", "bundle");
  const candidates = [
    bundleRoot,
    resolve(here, "..", "..", ".."),
    resolve(process.cwd()),
    resolve(process.cwd(), "..", ".."),
    "/var/task",
    resolve("/var/task", ".."),
  ];

  for (const root of candidates) {
    if (existsSync(join(root, "registry.json"))) return root;
  }

  throw new Error(
    `registry.json not found (cwd=${process.cwd()}, here=${here}). Set COMPIFY_REPO_ROOT or bundle registry.json with the serverless function.`,
  );
}

let repoRoot: string | null = null;

/** Repo root — resolved lazily so serverless cold starts can find bundled files. */
export function getRepoRoot(): string {
  if (!repoRoot) repoRoot = resolveRepoRoot();
  return repoRoot;
}

/**
 * Loads the registry directly from disk so the MCP server has no runtime
 * dependency on bundler JSON-import behavior. Re-read lazily and cached.
 */
let cached: RegistryEntry[] | null = null;
export function loadRegistry(): RegistryEntry[] {
  if (cached) return cached;
  const raw = readFileSync(join(getRepoRoot(), "registry.json"), "utf8");
  cached = JSON.parse(raw) as RegistryEntry[];
  return cached;
}

export function findEntry(name: string): RegistryEntry | undefined {
  return loadRegistry().find((c) => c.name === name);
}

/** Map registry sourcePath to on-disk location (monorepo vs staged bundle). */
function resolveSourcePath(entry: RegistryEntry): string {
  const root = getRepoRoot();
  const bundlePrefix = "packages/library/src/components/";
  if (
    entry.sourcePath.startsWith(bundlePrefix) &&
    existsSync(join(root, "components"))
  ) {
    const rel = entry.sourcePath.slice(bundlePrefix.length).replace(/\.tsx$/, ".source");
    return join(root, "components", rel);
  }
  return join(root, entry.sourcePath);
}

/** Returns the raw `.tsx` source text for a registry entry. */
export function readComponentSource(entry: RegistryEntry): string {
  return readFileSync(resolveSourcePath(entry), "utf8");
}
