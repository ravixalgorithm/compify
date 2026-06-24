import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { RegistryEntry } from "@compify/shared";

/** Cache tag for all component reads. Revalidated on admin publish/delete. */
export const COMPONENTS_TAG = "components";

/**
 * Public (anon) read client for the components table. Published rows are
 * publicly readable via RLS, so no session is needed. Server-side use.
 */
function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public env vars are not set.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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
    premium: row.premium ?? false,
    sourcePath: "",
    previewAccent: row.preview_accent ?? "#7C3AED",
    previewLayout: row.preview_layout?.mode ?? "full",
    thumbnail: row.thumbnail_url ?? undefined,
    framerModuleUrl: row.framer_module_url ?? undefined,
    props: row.props ?? [],
    usage: row.usage ?? undefined,
    related: row.related?.length ? row.related : undefined,
    copyCount: row.copy_count ?? 0,
    compiledModuleUrl: row.compiled_module_url ?? undefined,
    previewSurfaces: surfacesFromLayout(row.preview_layout),
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
        fit: s.fit === "center" || s.fit === "fill" ? s.fit : "auto",
        minHeight: typeof s.minHeight === "number" ? s.minHeight : undefined,
        maxWidth: typeof s.maxWidth === "number" ? s.maxWidth : undefined,
        padding: typeof s.padding === "number" ? s.padding : undefined,
        align: s.align === "top" || s.align === "bottom" ? s.align : undefined,
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function toDbComponent(row: Record<string, any>): DbComponent {
  return { entry: rowToEntry(row), source: row.source ?? "", moduleUrl: row.compiled_module_url ?? null };
}

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
  const { data, error } = await readClient()
    .from("components")
    .select("*")
    .eq("status", "published")
    .order("copy_count", { ascending: false });
  if (error || !data) return [];
  return data.map(toDbComponent);
}

// ISR: results are cached and only refreshed when COMPONENTS_TAG is revalidated
// (on admin publish/delete) or after the fallback window. unstable_cache keys
// by keyParts + arguments, so getDbComponent caches per slug.
export const getDbComponent = unstable_cache(fetchOne, ["db-component"], {
  tags: [COMPONENTS_TAG],
  revalidate: 3600,
});

export const listDbComponents = unstable_cache(fetchAll, ["db-components-list"], {
  tags: [COMPONENTS_TAG],
  revalidate: 3600,
});
