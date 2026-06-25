import { listDbComponents } from "@/lib/db-components";
import { getTrendingScores, getPins } from "@/lib/stats-server";
import { Gallery } from "@/components/Gallery";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string };
}) {
  const sort = searchParams.sort;
  const [components, scores, pins] = await Promise.all([
    listDbComponents(),
    getTrendingScores(),
    getPins(),
  ]);

  // Trending = live engagement (views×1 + saves×5); copyCount is the seeded
  // baseline used only as a deterministic tie-breaker when scores are equal.
  // Per-column admin pinning is applied client-side in Gallery (it needs the
  // live column layout); here we just produce the base engagement order.
  const score = (name: string) => scores.get(name) ?? 0;
  const entries = components
    .map((c) => c.entry)
    .sort((a, b) => {
      if (sort === "featured") {
        return (
          Number(b.premium) - Number(a.premium) ||
          score(b.name) - score(a.name) ||
          b.copyCount - a.copyCount
        );
      }
      // Trending and the default home view rank by engagement score.
      return score(b.name) - score(a.name) || b.copyCount - a.copyCount;
    });

  return <Gallery entries={entries} initialSort={sort ?? null} pins={pins} />;
}
