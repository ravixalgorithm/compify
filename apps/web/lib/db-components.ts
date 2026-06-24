import { createClient } from "@supabase/supabase-js";
import type { RegistryEntry } from "@compify/shared";

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
  };
}

export async function getDbComponent(slug: string): Promise<DbComponent | null> {
  const { data, error } = await readClient()
    .from("components")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return { entry: rowToEntry(data), source: data.source ?? "", moduleUrl: data.compiled_module_url ?? null };
}

export async function listDbComponents(): Promise<DbComponent[]> {
  const { data, error } = await readClient()
    .from("components")
    .select("*")
    .eq("status", "published")
    .order("slug");
  if (error || !data) return [];
  return data.map((row) => ({
    entry: rowToEntry(row),
    source: row.source ?? "",
    moduleUrl: row.compiled_module_url ?? null,
  }));
}
