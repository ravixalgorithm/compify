"use client";

import { useMemo } from "react";
import type { RegistryEntry } from "@compify/shared";
import { useGalleryFilter } from "@/lib/gallery-filter-context";
import { useGalleryBatch } from "@/lib/useGalleryBatch";
import { GalleryCard } from "./GalleryCard";
import { GalleryCardSkeleton } from "./GalleryCardSkeleton";

const EAGER_THUMBNAIL_COUNT = 8;

export function Gallery({
  entries,
  initialSort = null,
}: {
  entries: RegistryEntry[];
  initialSort?: string | null;
}) {
  const { query, category } = useGalleryFilter();

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

  return (
    <main className="relative min-w-0 flex-1 p-1.5">
      <div className="min-h-[calc(100vh-12px)] bg-bg p-[26px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        {filtered.length === 0 ? (
          <div className="grid h-[60vh] place-items-center">
            <p className="text-sm tracking-tighter text-muted">No components match your filters.</p>
          </div>
        ) : (
          <>
            <div className="columns-1 gap-[14px] sm:columns-2 xl:columns-3">
              {visibleEntries.map((e, index) => (
                <GalleryCard
                  key={e.name}
                  entry={e}
                  priority={index < EAGER_THUMBNAIL_COUNT}
                />
              ))}
            </div>
            {hasMore ? (
              <div
                ref={sentinelRef}
                className="columns-1 gap-[14px] sm:columns-2 xl:columns-3"
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
