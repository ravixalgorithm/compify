import type { RegistryEntry } from "@compify/shared/types";
import { getSupabase } from "./supabase.js";

/**
 * Component data for the MCP server, read from the Supabase `components` table
 * (the same source the website renders from). Replaces the old registry.json +
 * filesystem .tsx reads, so MCP works in serverless deploys with no bundled
 * files. Results are cached briefly so repeated tool calls don't hammer the DB.
 */

function notConfigured(): never {
  throw new Error(
    "Supabase is not configured for the MCP server. Set SUPABASE_URL and a key (SUPABASE_SERVICE_ROLE_KEY or a publishable key).",
  );
}

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
  };
}

const TTL_MS = 60_000;
let cache: { at: number; entries: RegistryEntry[] } | null = null;
function now(): number {
  return Date.now();
}

/** All published components (cached ~60s). Used by list_components. */
export async function listComponents(): Promise<RegistryEntry[]> {
  if (cache && now() - cache.at < TTL_MS) return cache.entries;
  const supabase = getSupabase() ?? notConfigured();
  const { data, error } = await supabase
    .from("components")
    .select("*")
    .eq("status", "published")
    .order("copy_count", { ascending: false });
  if (error) throw new Error(`Failed to load components: ${error.message}`);
  const entries = (data ?? []).map(rowToEntry);
  cache = { at: now(), entries };
  return entries;
}

/** One published component + its raw .tsx source. Used by get_component. */
export async function getComponent(
  name: string,
): Promise<{ entry: RegistryEntry; source: string } | undefined> {
  const supabase = getSupabase() ?? notConfigured();
  const { data, error } = await supabase
    .from("components")
    .select("*")
    .eq("slug", name)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return undefined;
  return { entry: rowToEntry(data), source: data.source ?? "" };
}
