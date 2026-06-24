import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { ComponentCategory, PropDoc, RegistryEntry, TweakControl } from "./types";
import { parsePropertyControls, isTweakableControl } from "./parsePropertyControls";

const COMPONENTS_DIR = "packages/library/src/components";
const REGISTRY_PATH = "registry.json";
const INDEX_PATH = "packages/library/src/index.ts";
const THUMBNAILS_DIR = "apps/web/public/thumbnails";

export interface ComponentMeta {
  displayName?: string;
  category?: ComponentCategory;
  description?: string;
  tags?: string[];
  previewAccent?: string;
  previewLayout?: RegistryEntry["previewLayout"];
  premium?: boolean;
  variants?: RegistryEntry["variants"];
  related?: string[];
  keyFeatures?: string[];
  descriptionParagraphs?: string[];
  thumbnail?: string;
  /** Published Framer module link after hosting on Framer. */
  framerModuleUrl?: string;
  usage?: string;
}

export function getRepoRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
  for (const dir of candidates) {
    if (existsSync(join(dir, REGISTRY_PATH))) return dir;
  }
  return process.cwd();
}

function slugFromFile(file: string): string {
  return basename(file, ".tsx");
}

function exportNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readMeta(root: string, slug: string): ComponentMeta | undefined {
  const metaPath = join(root, COMPONENTS_DIR, `${slug}.meta.json`);
  if (!existsSync(metaPath)) return undefined;
  return JSON.parse(readFileSync(metaPath, "utf8")) as ComponentMeta;
}

function descriptionFromSource(source: string): string | undefined {
  const match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return undefined;
  const lines = match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"));
  return lines[0];
}

function dependenciesFromSource(source: string): string[] {
  const deps = new Set<string>();
  if (/from\s+["']framer-motion["']/.test(source)) deps.add("framer-motion");
  if (/from\s+["']lucide-react["']/.test(source)) deps.add("lucide-react");
  return [...deps];
}

function propsFromSchema(schema: TweakControl[]): PropDoc[] {
  return schema.filter(isTweakableControl).map((control) => ({
    name: control.key,
    type:
      control.type === "array" && control.items?.length
        ? `Array<{ ${control.items.map((item) => `${item.key}: ${item.type}`).join(", ")} }>`
        : control.type === "enum" && control.options
          ? control.options.map((o) => `"${o}"`).join(" | ")
          : control.type,
    default: JSON.stringify(control.default),
    description: `${control.label} prop.`,
  }));
}

function usageFromSlug(slug: string, exportName: string): string {
  return `import ${exportName} from "./${slug}"\n\n<${exportName} />`;
}

function defaultPreviewLayout(
  category: ComponentCategory,
  slug: string,
): RegistryEntry["previewLayout"] {
  if (slug === "scroll-reveal" || slug === "logo-cloud") return "full";
  if (category === "cards" || category === "forms") return "centered";
  if (category === "animation") return "centered";
  return "full";
}

// Reused by the DB-backed publish route so a component row is derived from
// source identically to the filesystem registry (single source of truth).
export {
  propsFromSchema,
  usageFromSlug,
  descriptionFromSource,
  dependenciesFromSource,
  exportNameFromSlug,
};

function mergeEntry(
  existing: RegistryEntry | undefined,
  slug: string,
  source: string,
  tweakSchema: TweakControl[],
  meta?: ComponentMeta,
): RegistryEntry {
  const exportName = exportNameFromSlug(slug);
  const sourcePath = `${COMPONENTS_DIR}/${slug}.tsx`;
  const parsedDescription = descriptionFromSource(source);

  return {
    name: slug,
    displayName: meta?.displayName ?? existing?.displayName ?? titleFromSlug(slug),
    category: meta?.category ?? existing?.category ?? "cards",
    description:
      meta?.description ??
      existing?.description ??
      parsedDescription ??
      `${titleFromSlug(slug)} component.`,
    descriptionParagraphs: meta?.descriptionParagraphs ?? existing?.descriptionParagraphs,
    keyFeatures: meta?.keyFeatures ?? existing?.keyFeatures,
    tags: meta?.tags ?? existing?.tags ?? [],
    dependencies: dependenciesFromSource(source).length
      ? dependenciesFromSource(source)
      : (existing?.dependencies ?? []),
    tweakSchema,
    variants: meta?.variants ?? existing?.variants ?? ["framer"],
    premium: meta?.premium ?? existing?.premium ?? false,
    sourcePath,
    previewAccent: meta?.previewAccent ?? existing?.previewAccent ?? "#7C3AED",
    previewLayout:
      meta?.previewLayout ??
      existing?.previewLayout ??
      defaultPreviewLayout(meta?.category ?? existing?.category ?? "cards", slug),
    thumbnail: meta?.thumbnail ?? existing?.thumbnail ?? `/thumbnails/${slug}.png`,
    framerModuleUrl: meta?.framerModuleUrl ?? existing?.framerModuleUrl,
    props: propsFromSchema(tweakSchema),
    usage: meta?.usage ?? existing?.usage ?? usageFromSlug(slug, exportName),
    related: meta?.related ?? existing?.related,
    copyCount: existing?.copyCount ?? 0,
  };
}

export function generateIndexSource(slugs: string[]): string {
  const imports = slugs
    .map((slug) => `import ${exportNameFromSlug(slug)} from "./components/${slug}";`)
    .join("\n");

  const mapEntries = slugs
    .map((slug) => {
      const key = slug.includes("-") ? `"${slug}"` : slug;
      return `  ${key}: ${exportNameFromSlug(slug)},`;
    })
    .join("\n");

  const exports = slugs.map((slug) => `  ${exportNameFromSlug(slug)},`).join("\n");

  return `import type { ComponentType } from "react";

${imports}

/**
 * Slug -> React component map. The marketplace preview looks components up by
 * the same slug used in \`registry.json\`. Each module is also the exact source
 * the MCP serves, so what you preview is what gets delivered.
 *
 * AUTO-GENERATED by \`pnpm registry:sync\` — do not edit the map by hand.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const components: Record<string, ComponentType<any>> = {
${mapEntries}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLibraryComponent(name: string): ComponentType<any> | undefined {
  return components[name];
}

export {
${exports}
};
`;
}

export interface SyncRegistryResult {
  root: string;
  slugs: string[];
  created: string[];
  updated: string[];
  warnings: string[];
}

export function syncRegistry(options: { write?: boolean } = {}): SyncRegistryResult {
  const write = options.write ?? true;
  const root = getRepoRoot();
  const componentsPath = join(root, COMPONENTS_DIR);
  const registryPath = join(root, REGISTRY_PATH);
  const indexPath = join(root, INDEX_PATH);

  const files = readdirSync(componentsPath)
    .filter((f: string) => f.endsWith(".tsx"))
    .sort();

  const existingRegistry = JSON.parse(readFileSync(registryPath, "utf8")) as RegistryEntry[];
  const byName = new Map(existingRegistry.map((entry) => [entry.name, entry]));

  const created: string[] = [];
  const updated: string[] = [];
  const warnings: string[] = [];
  const nextByName = new Map<string, RegistryEntry>();
  const newSlugs: string[] = [];

  for (const file of files) {
    const slug = slugFromFile(file);
    const source = readFileSync(join(componentsPath, file), "utf8");
    const tweakSchema = parsePropertyControls(source);
    const meta = readMeta(root, slug);
    const existing = byName.get(slug);

    if (!tweakSchema.length) {
      warnings.push(`${slug}: no addPropertyControls found — skipped control sync`);
      if (existing) {
        nextByName.set(slug, existing);
        byName.delete(slug);
        continue;
      }
    }

    const entry = mergeEntry(
      existing,
      slug,
      source,
      tweakSchema.length ? tweakSchema : (existing?.tweakSchema ?? []),
      meta,
    );

    if (!existing) {
      created.push(slug);
      newSlugs.push(slug);
    } else {
      updated.push(slug);
    }

    nextByName.set(slug, entry);
    byName.delete(slug);
  }

  // Preserve registry order; append new components at the end.
  const nextRegistry: RegistryEntry[] = [];
  const seen = new Set<string>();
  const pushUnique = (entry: RegistryEntry) => {
    if (seen.has(entry.name)) return;
    seen.add(entry.name);
    nextRegistry.push(entry);
  };

  for (const entry of existingRegistry) {
    const synced = nextByName.get(entry.name);
    if (synced) pushUnique(synced);
    nextByName.delete(entry.name);
  }
  for (const slug of newSlugs) {
    const entry = nextByName.get(slug);
    if (entry) pushUnique(entry);
    nextByName.delete(slug);
  }

  // Registry-only entries with no matching file.
  for (const orphan of byName.values()) {
    warnings.push(`${orphan.name}: in registry.json but no .tsx file — kept as-is`);
    pushUnique(orphan);
  }

  const slugs = files.map(slugFromFile);
  const indexSource = generateIndexSource(slugs);

  if (write) {
    writeFileSync(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`, "utf8");
    writeFileSync(indexPath, indexSource, "utf8");
  }

  return { root, slugs, created, updated, warnings };
}
