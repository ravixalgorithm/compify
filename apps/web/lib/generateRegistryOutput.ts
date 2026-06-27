import type { ComponentCategory, RegistryEntry, TweakControl, TweakState } from "@compify/shared";

export interface EditorDraft {
  templateSlug: string;
  name: string;
  displayName: string;
  category: ComponentCategory;
  description: string;
  descriptionParagraphs: string;
  keyFeatures: string;
  tags: string;
  related: string;
  previewAccent: string;
  featured: boolean;
  source: string;
  tweakSchema: TweakControl[];
  framerModuleUrl?: string;
  usage: string;
  /** JSON string of per-surface preview layout overrides (admin-edited). */
  previewLayout?: string;
  /** Existing uploaded gallery/variant thumbnail media URLs (edit mode). */
  galleryMedia?: string;
  variantMedia?: string;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function draftToRegistryEntry(draft: EditorDraft): RegistryEntry {
  const tags = draft.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    name: draft.name || "my-component",
    displayName: draft.displayName || "My Component",
    category: draft.category,
    description: draft.description || "Component description.",
    descriptionParagraphs: draft.descriptionParagraphs
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    keyFeatures: draft.keyFeatures
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    tags: tags.length ? tags : ["custom"],
    dependencies: [],
    tweakSchema: draft.tweakSchema,
    variants: ["framer"],
    featured: draft.featured,
    sourcePath: `packages/library/src/components/${draft.name || "my-component"}.tsx`,
    thumbnail: `/thumbnails/${draft.name || "my-component"}.png`,
    framerModuleUrl: draft.framerModuleUrl?.trim() || undefined,
    previewAccent: draft.previewAccent || "#7C3AED",
    props: draft.tweakSchema.map((control) => ({
      name: control.key,
      type: control.type,
      default: JSON.stringify(control.default),
      description: `${control.label} prop.`,
    })),
    usage:
      draft.usage ||
      `import MyComponent from "./${draft.name || "my-component"}"\n\n<MyComponent />`,
    related: draft.related
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    copyCount: 0,
  };
}

export function generateRegistryJson(entry: RegistryEntry): string {
  const payload = {
    name: entry.name,
    displayName: entry.displayName,
    category: entry.category,
    description: entry.description,
    tags: entry.tags,
    dependencies: entry.dependencies,
    variants: entry.variants,
    sourcePath: entry.sourcePath,
    previewAccent: entry.previewAccent,
    copyCount: entry.copyCount,
    ...(entry.framerModuleUrl ? { framerModuleUrl: entry.framerModuleUrl } : {}),
    tweakSchema: entry.tweakSchema,
    props: entry.props,
    usage: entry.usage,
  };

  return JSON.stringify(payload, null, 2);
}

export function generateIndexRegistration(name: string): string {
  const exportName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return [
    `import ${exportName} from "./components/${name}";`,
    "",
    `// Inside components map:`,
    `  "${name}": ${exportName},`,
  ].join("\n");
}

export function tweakDefaults(schema: TweakControl[]): TweakState {
  return Object.fromEntries(schema.map((c) => [c.key, c.default]));
}
