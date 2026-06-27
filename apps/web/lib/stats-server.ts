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

// "Trending" looks at a recent window so it reflects current momentum rather
// than all-time totals. Buckets only exist from when the daily-stats migration
// ran, so early on the window is naturally shallow.
export const TRENDING_WINDOW_DAYS = 7;

// Trending is a curated shortlist, not the whole catalogue — cap it so only the
// genuinely-hot components show.
export const TRENDING_LIMIT = 20;

/**
 * Time-windowed trending score per slug, summed from `component_stats_daily`
 * over the last {@link TRENDING_WINDOW_DAYS} days (inclusive of today) using the
 * same `views * 1 + copies * 5` weighting. Slugs with no recent activity are
 * absent (callers treat a missing slug as 0 and fall back to all-time
 * engagement). Read live so trending tracks recent activity.
 */
export async function getRecentTrendingScores(): Promise<Map<string, number>> {
  try {
    // `day` is a DATE column; compare against an ISO date string (UTC, matching
    // Postgres `current_date`). N-1 so the window includes today.
    const cutoff = new Date(Date.now() - (TRENDING_WINDOW_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await readClient()
      .from("component_stats_daily")
      .select("slug, views, copies")
      .gte("day", cutoff);
    if (error || !data) return new Map();
    const out = new Map<string, number>();
    for (const r of data as { slug: string; views: number | string; copies: number | string }[]) {
      out.set(r.slug, (out.get(r.slug) ?? 0) + trendingScore(Number(r.views), Number(r.copies)));
    }
    return out;
  } catch {
    return new Map();
  }
}

/**
 * Manual ordering for the Featured view: slug -> featured_position (lower =
 * nearer the top). Only featured rows with an explicit position are returned;
 * the rest fall back to engagement order. Independent of the home-grid pins.
 * Read live so a reorder reflects immediately.
 */
export async function getFeaturedOrder(): Promise<Map<string, number>> {
  try {
    const { data, error } = await readClient()
      .from("components")
      .select("slug, featured_position")
      .eq("status", "published")
      .eq("featured", true)
      .not("featured_position", "is", null);
    if (error || !data) return new Map();
    const out = new Map<string, number>();
    for (const r of data as { slug: string; featured_position: number | null }[]) {
      if (r.featured_position != null) out.set(r.slug, Number(r.featured_position));
    }
    return out;
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
