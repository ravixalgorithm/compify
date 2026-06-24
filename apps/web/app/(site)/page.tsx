import { registry } from "@compify/shared";
import { Gallery } from "@/components/Gallery";

export default function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string };
}) {
  const sort = searchParams.sort;
  const entries = [...registry].sort((a, b) => {
    if (sort === "featured") return Number(b.premium) - Number(a.premium) || b.copyCount - a.copyCount;
    return b.copyCount - a.copyCount;
  });

  return <Gallery entries={entries} initialSort={sort ?? null} />;
}
