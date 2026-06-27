import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RegistryEntry } from "@compify/shared";

/** Cache tag kept for the admin revalidate calls (no-op now reads are live). */
export const COMPONENTS_TAG = "components";

/**
 * Public (anon) read client for the components table. Published rows are
 * publicly readable via RLS, so no session is needed. Server-side use.
 * Reads are forced live (no-store) so the gallery always reflects the DB —
 * including direct edits/wipes — instead of serving a stale cached list.
 */
function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public env vars are not set.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export interface DbComponent {
  entry: RegistryEntry;
  source: string;
  moduleUrl: string | null;
}

/** Maps a components row to the RegistryEntry shape the UI already consumes. */
function rowToEntry(row: Record<string, any>): RegistryEntry {
  return {
    name: row.slug,
    displayName: row.display_name,
    category: row.category,
    description: row.description ?? "",
    descriptionParagraphs: row.description_paragraphs?.length ? row.description_paragraphs : undefined,
    keyFeatures: row.key_features?.length ? row.key_features : undefined,
    tags: row.tags ?? [],
    dependencies: row.dependencies ?? [],
    tweakSchema: row.tweak_schema ?? [],
    variants: row.variants ?? ["framer"],
    featured: row.featured ?? false,
    sourcePath: "",
    previewAccent: row.preview_accent ?? "#7C3AED",
    previewLayout: row.preview_layout?.mode ?? "full",
    thumbnail: row.thumbnail_url ?? undefined,
    galleryMedia: row.gallery_media_url ?? undefined,
    variantMedia: row.variant_media_url ?? undefined,
    framerModuleUrl: row.framer_module_url ?? undefined,
    props: row.props ?? [],
    usage: row.usage ?? undefined,
    related: row.related?.length ? row.related : undefined,
    copyCount: row.copy_count ?? 0,
    compiledModuleUrl: row.compiled_module_url ?? undefined,
    previewSurfaces: surfacesFromLayout(row.preview_layout),
    previewDefaults:
      row.preview_defaults && typeof row.preview_defaults === "object" && !Array.isArray(row.preview_defaults)
        ? row.preview_defaults
        : undefined,
  };
}

// Extract per-surface framing from the stored preview_layout jsonb
// ({ mode?, gallery?, detail?, variant? }), ignoring the legacy `mode` key.
function surfacesFromLayout(layout: unknown): RegistryEntry["previewSurfaces"] {
  if (!layout || typeof layout !== "object") return undefined;
  const out: NonNullable<RegistryEntry["previewSurfaces"]> = {};
  for (const surface of ["gallery", "detail", "variant"] as const) {
    const s = (layout as Record<string, any>)[surface];
    if (s && typeof s === "object") {
      out[surface] = {
        fit: ["center", "fill", "fit"].includes(s.fit) ? s.fit : "auto",
        minHeight: typeof s.minHeight === "number" ? s.minHeight : undefined,
        maxWidth: typeof s.maxWidth === "number" ? s.maxWidth : undefined,
        padding: typeof s.padding === "number" ? s.padding : undefined,
        align: s.align === "top" || s.align === "bottom" ? s.align : undefined,
        scale: typeof s.scale === "number" ? s.scale : undefined,
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function toDbComponent(row: Record<string, any>): DbComponent {
  return { entry: rowToEntry(row), source: row.source ?? "", moduleUrl: row.compiled_module_url ?? null };
}

// Columns the list/gallery/sidebar need (everything `rowToEntry` reads). The big
// `source` column is intentionally excluded — the list discards it (consumers
// use `c.entry` only), so fetching every component's raw .tsx on every request
// was pure waste. The detail page (`fetchOne`) still selects it via `*`.
const LIST_COLUMN_LIST = [
  "slug",
  "display_name",
  "category",
  "description",
  "description_paragraphs",
  "key_features",
  "tags",
  "dependencies",
  "tweak_schema",
  "variants",
  "featured",
  "preview_accent",
  "preview_layout",
  "preview_defaults",
  "thumbnail_url",
  "gallery_media_url",
  "variant_media_url",
  "framer_module_url",
  "props",
  "usage",
  "related",
  "copy_count",
  "compiled_module_url",
];
const LIST_COLUMNS = LIST_COLUMN_LIST.join(",");
// Fallback column list for a DB that predates the preview_defaults migration —
// so the gallery still loads (instead of emptying) before the ALTER is run.
const LIST_COLUMNS_LEGACY = LIST_COLUMN_LIST.filter((c) => c !== "preview_defaults").join(",");

async function fetchOne(slug: string): Promise<DbComponent | null> {
  const { data, error } = await readClient()
    .from("components")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return toDbComponent(data);
}

async function fetchAll(): Promise<DbComponent[]> {
  const run = (columns: string) =>
    readClient()
      .from("components")
      .select(columns)
      .eq("status", "published")
      .order("copy_count", { ascending: false });

  let { data, error } = await run(LIST_COLUMNS);
  // 42703 = undefined_column: the preview_defaults migration hasn't been run on
  // this DB yet. Retry without it so the gallery still loads (cards just fall
  // back to the component's own control defaults until the column is added).
  if (error?.code === "42703") {
    ({ data, error } = await run(LIST_COLUMNS_LEGACY));
  }
  if (error || !data) return [];
  return data.map(toDbComponent);
}

// Live reads — the gallery/sidebar always reflect the current DB. Wrapped in
// React `cache()` so the layout and the page that both call `listDbComponents`
// in the same request share a single Supabase round-trip instead of two.
export const getDbComponent = cache(fetchOne);
export const listDbComponents = cache(fetchAll);
