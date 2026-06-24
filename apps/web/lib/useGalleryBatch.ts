"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 18;

export function useGalleryBatch(total: number, resetKey: string) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(PAGE_SIZE, total));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(PAGE_SIZE, total));
  }, [resetKey, total]);

  useEffect(() => {
    if (visibleCount >= total) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, total));
        }
      },
      { rootMargin: "480px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, total]);

  return { visibleCount, sentinelRef, hasMore: visibleCount < total };
}
