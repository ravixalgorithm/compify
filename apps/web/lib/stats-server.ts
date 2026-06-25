import { createClient } from "@supabase/supabase-js";

// Trending score weights: a save (copy) signals far stronger intent than a view.
export const TRENDING_VIEW_POINTS = 1;
export const TRENDING_SAVE_POINTS = 5;

/**
 * Public (anon) read client for component_stats. The table is publicly readable
 * via RLS (component_stats_read), so no session is needed. Server-side use.
 */
function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public env vars are not set.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js caches fetch() in Server Components by default, which would freeze
    // the stats snapshot. Force live reads so trending reflects current activity.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export function trendingScore(views: number, copies: number): number {
  return views * TRENDING_VIEW_POINTS + copies * TRENDING_SAVE_POINTS;
}

/**
 * Live trending score per component slug, derived from component_stats:
 * `views * 1 + copies * 5`. Components with no stats row are simply absent
 * (callers treat a missing slug as score 0). Read live (uncached) so trending
 * reflects recent activity; the table is one small row per component.
 */
export async function getTrendingScores(): Promise<Map<string, number>> {
  try {
    const { data, error } = await readClient()
      .from("component_stats")
      .select("slug, views, copies");
    if (error || !data) return new Map();
    return new Map(
      data.map((r: { slug: string; views: number | string; copies: number | string }) => [
        r.slug,
        trendingScore(Number(r.views), Number(r.copies)),
      ]),
    );
  } catch {
    return new Map();
  }
}

export type ComponentPin = { column: number; position: number };

/**
 * Admin pins for the home grid: slug -> { column, position }. Pinned components
 * sit at the top of their column (lower position = higher). Unpinned components
 * are absent and fall back to the trending score. Read live so a pin reflects
 * immediately.
 */
export async function getPins(): Promise<Record<string, ComponentPin>> {
  try {
    const { data, error } = await readClient()
      .from("components")
      .select("slug, grid_column, sort_position")
      .eq("status", "published")
      .not("grid_column", "is", null);
    if (error || !data) return {};
    const out: Record<string, ComponentPin> = {};
    for (const r of data as { slug: string; grid_column: number | null; sort_position: number | null }[]) {
      if (r.grid_column == null) continue;
      out[r.slug] = { column: Number(r.grid_column), position: Number(r.sort_position ?? 0) };
    }
    return out;
  } catch {
    return {};
  }
}
