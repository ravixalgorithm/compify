import { listDbComponents } from "@/lib/db-components";
import { Gallery } from "@/components/Gallery";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string };
}) {
  const sort = searchParams.sort;
  const entries = (await listDbComponents()).map((c) => c.entry).sort((a, b) => {
    if (sort === "featured") return Number(b.premium) - Number(a.premium) || b.copyCount - a.copyCount;
    return b.copyCount - a.copyCount;
  });

  return <Gallery entries={entries} initialSort={sort ?? null} />;
}
