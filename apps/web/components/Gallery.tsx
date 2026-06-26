"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegistryEntry } from "@compify/shared";
import type { ComponentPin } from "@/lib/stats-server";
import { useGalleryFilter } from "@/lib/gallery-filter-context";
import { useGalleryBatch } from "@/lib/useGalleryBatch";
import { GalleryCard } from "./GalleryCard";
import { GalleryCardSkeleton } from "./GalleryCardSkeleton";

// Cards loaded eagerly (media rendered in the SSR HTML, no scroll wait) so the
// first viewport appears immediately. Kept modest because eager videos buffer —
// loading too many at once competes with the visible row.
const EAGER_THUMBNAIL_COUNT = 8;

/** Matches the gallery breakpoints: 1 col < 640, 2 cols < 1280, 3 cols ≥ 1280. */
function useColumnCount() {
  // SSR/first paint render 3 (the xl default) to avoid a hydration mismatch;
  // the effect corrects to the real count right after mount.
  const [n, setN] = useState(3);
  useEffect(() => {
    const calc = () =>
      setN(window.innerWidth >= 1280 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return n;
}

export function Gallery({
  entries,
  initialSort = null,
  pins = {},
}: {
  entries: RegistryEntry[];
  initialSort?: string | null;
  pins?: Record<string, ComponentPin>;
}) {
  const { query, category } = useGalleryFilter();
  const columnCount = useColumnCount();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category && e.category !== category) return false;
      if (q) {
        const hay = `${e.displayName} ${e.name} ${e.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, category]);

  const batchKey = `${query}|${category ?? ""}|${initialSort ?? ""}|${filtered.length}`;
  const { visibleCount, sentinelRef, hasMore } = useGalleryBatch(filtered.length, batchKey);
  const visibleEntries = filtered.slice(0, visibleCount);

  // Admin "move to top" only makes sense on the unfiltered default home grid —
  // that's the view whose column pins control the order.
  const pinnable = !initialSort && !category && !query.trim();

  const eager = useMemo(
    () => new Set(visibleEntries.slice(0, EAGER_THUMBNAIL_COUNT).map((e) => e.name)),
    [visibleEntries],
  );

  const columns = useMemo(() => {
    const n = columnCount;
    const cols: RegistryEntry[][] = Array.from({ length: n }, () => []);

    // Surface pinned cards even if they rank below the visible window.
    const inWindow = new Set(visibleEntries.map((e) => e.name));
    const render = [...visibleEntries];
    if (pinnable) {
      for (const e of filtered) {
        if (pins[e.name] && !inWindow.has(e.name)) render.push(e);
      }
    }

    // Order: admin-pinned first (by pin position), then the rest in trending
    // order — so "move to top" sends a card to the very START of the grid. Array
    // sort is stable, so non-pinned keep their trending order.
    const ordered = pinnable
      ? [...render].sort((a, b) => {
          const pa = pins[a.name];
          const pb = pins[b.name];
          if (pa && pb) return pa.position - pb.position;
          if (pa) return -1;
          if (pb) return 1;
          return 0;
        })
      : render;

    // Masonry fill: each card drops into the shortest column (left-to-right on
    // ties), so the order flows top-left first and pinned cards spread across
    // the top rows instead of stacking in one column.
    for (const e of ordered) {
      let t = 0;
      for (let c = 1; c < n; c++) if (cols[c].length < cols[t].length) t = c;
      cols[t].push(e);
    }
    return cols;
  }, [visibleEntries, filtered, columnCount, pins, pinnable]);

  return (
    <main className="relative min-w-0 flex-1 p-1.5">
      <div className="min-h-[calc(100vh-12px)] bg-bg p-[26px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        {filtered.length === 0 ? (
          <div className="grid h-[60vh] place-items-center">
            <p className="text-sm tracking-tighter text-muted">No components match your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-[14px]">
              {columns.map((col, ci) => (
                <div key={ci} className="flex min-w-0 flex-1 flex-col">
                  {col.map((e) => (
                    <GalleryCard
                      key={e.name}
                      entry={e}
                      priority={eager.has(e.name)}
                      pinnable={pinnable}
                      column={ci}
                    />
                  ))}
                </div>
              ))}
            </div>
            {hasMore ? (
              <div
                ref={sentinelRef}
                className="mt-[14px] flex gap-[14px]"
                aria-hidden
              >
                <GalleryCardSkeleton category="hero" />
                <GalleryCardSkeleton category="cards" />
                <GalleryCardSkeleton category="forms" />
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
