"use client";

import { useEffect, useState } from "react";
import type { RegistryEntry } from "@compify/shared";
import { useInView } from "@/lib/useInView";
import { GalleryInlinePreview } from "./GalleryInlinePreview";
import { GalleryMediaSkeleton } from "./GalleryCardSkeleton";
import { MediaThumb } from "./MediaThumb";
import { cn } from "@/lib/cn";

/** Sidebar grid card preview — Figma 227:2829, 152px live component preview. */
export function DetailVariantPreview({ entry }: { entry: RegistryEntry }) {
  const { ref, inView } = useInView<HTMLDivElement>("120px 0px");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [entry.name]);

  const showSkeleton = inView && !ready;

  // Admin-uploaded variant media (image/video) replaces the live preview:
  // fills the fixed tile width, height follows its aspect ratio.
  if (entry.variantMedia) {
    return (
      <div className="w-full overflow-hidden bg-black">
        <MediaThumb src={entry.variantMedia} alt={`${entry.displayName} preview`} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex size-full items-center justify-center overflow-hidden bg-black">
      {showSkeleton ? (
        <GalleryMediaSkeleton
          category={entry.category}
          minHeight={152}
          className="absolute inset-0"
        />
      ) : null}

      {inView ? (
        <div className={cn("flex h-full w-full items-center justify-center", !ready && "pointer-events-none invisible")}>
          <GalleryInlinePreview
            entry={entry}
            surface="variant"
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}
    </div>
  );
}
