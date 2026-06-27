import { listDbComponents } from "@/lib/db-components";
import {
  getTrendingScores,
  getRecentTrendingScores,
  getFeaturedOrder,
  getPins,
  TRENDING_LIMIT,
} from "@/lib/stats-server";
import { Gallery } from "@/components/Gallery";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string };
}) {
  const sort = searchParams.sort;
  const [components, scores, recent, featuredOrder, pins] = await Promise.all([
    listDbComponents(),
    getTrendingScores(),
    // Recent-window scores are only needed for the Trending view.
    sort === "trending" ? getRecentTrendingScores() : Promise.resolve(new Map<string, number>()),
    // Manual Featured ordering is only needed for the Featured view.
    sort === "featured" ? getFeaturedOrder() : Promise.resolve(new Map<string, number>()),
    getPins(),
  ]);

  // `score` = all-time engagement (views×1 + saves×5); `recentScore` = the same
  // weighting over the last few days. copyCount is the seeded baseline, used only
  // as a deterministic final tie-breaker. Per-column admin pinning is applied
  // client-side in Gallery (it needs the live column layout).
  const score = (name: string) => scores.get(name) ?? 0;
  const recentScore = (name: string) => recent.get(name) ?? 0;
  let entries = components
    .map((c) => c.entry)
    .sort((a, b) => {
      if (sort === "trending") {
        // What's hot now: recent-window engagement, with all-time as the tie-break.
        return (
          recentScore(b.name) - recentScore(a.name) ||
          score(b.name) - score(a.name) ||
          b.copyCount - a.copyCount
        );
      }
      if (sort === "featured") {
        // Admin's manual order first (where set), then engagement for the rest.
        const pa = featuredOrder.get(a.name);
        const pb = featuredOrder.get(b.name);
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return score(b.name) - score(a.name) || b.copyCount - a.copyCount;
      }
      // Default home view ranks by all-time engagement.
      return score(b.name) - score(a.name) || b.copyCount - a.copyCount;
    });

  // Featured shows ONLY the admin-curated components (not everything-with-featured-on-top).
  if (sort === "featured") {
    entries = entries.filter((e) => e.featured);
  }
  // Trending is a curated shortlist: only components with recent activity, capped
  // at TRENDING_LIMIT. Empty until the daily-stats buckets start filling (they only
  // record activity from after the migration runs).
  if (sort === "trending") {
    entries = entries.filter((e) => recentScore(e.name) > 0).slice(0, TRENDING_LIMIT);
  }

  return <Gallery entries={entries} initialSort={sort ?? null} pins={pins} />;
}
