import { parsePropertyControls } from "@compify/shared/parse-property-controls";
import {
  propsFromSchema,
  usageFromSlug,
  descriptionFromSource,
  dependenciesFromSource,
  exportNameFromSlug,
} from "@compify/shared/server";
import type { ComponentCategory, TweakControl } from "@compify/shared/types";

export interface ComponentInput {
  slug: string;
  source: string;
  displayName: string;
  category: ComponentCategory;
  description: string;
  descriptionParagraphs: string[];
  keyFeatures: string[];
  tags: string[];
  related: string[];
  previewAccent: string;
  featured: boolean;
  framerModuleUrl?: string;
  usage?: string;
}

/**
 * Builds the metadata columns of a `components` row from source + admin form
 * fields, deriving tweak_schema / props / usage / dependencies from the source
 * exactly the way the filesystem registry (syncRegistry) does — one source of
 * truth. Does NOT include source/compiled/status columns; the route adds those.
 *
 * `opts.tweakSchema` is the schema introspected from the compiled module (the
 * full, real-default schema for every ControlType). When present it wins; we
 * only fall back to the regex source parser if introspection failed.
 */
export function deriveComponentRow(
  input: ComponentInput,
  opts?: { tweakSchema?: TweakControl[] | null },
) {
  const tweakSchema =
    opts?.tweakSchema && opts.tweakSchema.length
      ? opts.tweakSchema
      : parsePropertyControls(input.source);
  const exportName = exportNameFromSlug(input.slug);
  return {
    slug: input.slug,
    display_name: input.displayName || input.slug,
    category: input.category,
    description:
      input.description ||
      descriptionFromSource(input.source) ||
      `${input.displayName || input.slug} component.`,
    description_paragraphs: input.descriptionParagraphs,
    key_features: input.keyFeatures,
    tags: input.tags,
    related: input.related,
    dependencies: dependenciesFromSource(input.source),
    variants: ["framer"],
    featured: input.featured,
    tweak_schema: tweakSchema,
    props: propsFromSchema(tweakSchema),
    usage: input.usage || usageFromSlug(input.slug, exportName),
    preview_accent: input.previewAccent,
    framer_module_url: input.framerModuleUrl ?? null,
    source: input.source,
  };
}
