import registryJson from "../../../registry.json";
import type { ComponentCategory, RegistryEntry } from "./types";

/**
 * The component registry — loaded from the root `registry.json`, the single
 * source of truth shared by the marketplace website and the MCP server.
 */
export const registry: RegistryEntry[] = registryJson as RegistryEntry[];

export const CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "navbar", label: "Navbar" },
  { id: "pricing", label: "Pricing" },
  { id: "cards", label: "Cards" },
  { id: "forms", label: "Forms" },
  { id: "animation", label: "Animations" },
  { id: "data", label: "Data Display" },
];

/** Returns all registry entries, optionally filtered by category. */
export function listComponents(category?: ComponentCategory): RegistryEntry[] {
  const seen = new Set<string>();
  const unique = registry.filter((entry) => {
    if (seen.has(entry.name)) return false;
    seen.add(entry.name);
    return true;
  });
  if (!category) return unique;
  return unique.filter((c) => c.category === category);
}

/** Looks up a single component by slug. */
export function getComponent(name: string): RegistryEntry | undefined {
  return registry.find((c) => c.name === name);
}

/** All distinct tags across the registry, sorted by frequency. */
export function allTags(): string[] {
  const counts = new Map<string, number>();
  for (const c of registry) {
    for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
