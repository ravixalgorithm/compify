import type { ComponentCategory } from "@compify/shared";
import { GalleryCardFrame } from "./GalleryCardFrame";

/** Approximate masonry heights per category (px at ~1 column width). */
export const GALLERY_SKELETON_HEIGHT: Record<ComponentCategory, number> = {
  hero: 248,
  navbar: 188,
  pricing: 268,
  cards: 220,
  forms: 236,
  animation: 228,
  data: 240,
};

function SkeletonShimmer({ className }: { className?: string }) {
  // Plain shimmer block — cards show uploaded thumbnails/videos, so a
  // content-shaped placeholder (fake text lines + body) just misleads.
  return (
    <div
      className={`relative overflow-hidden bg-[#161616] ${className ?? ""}`}
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse bg-[#161616]" />
      <div className="ui-skeleton-shimmer absolute inset-0" />
    </div>
  );
}

export function GalleryMediaSkeleton({
  category = "cards",
  minHeight,
  aspectRatio,
  className,
}: {
  category?: ComponentCategory;
  minHeight?: number;
  /** Component's gallery aspect-ratio (e.g. "3 / 2"). When set, the skeleton
   *  height tracks the column width so it matches the real card — masonry needs
   *  varied heights since components aren't all the same size. */
  aspectRatio?: string;
  className?: string;
}) {
  const height = minHeight ?? GALLERY_SKELETON_HEIGHT[category] ?? 220;

  return (
    <div
      className={`w-full ${className ?? ""}`}
      style={aspectRatio ? { aspectRatio } : { minHeight: height }}
    >
      <SkeletonShimmer className="h-full min-h-[inherit]" />
    </div>
  );
}

/** Standalone card skeleton for infinite-scroll batch loading. */
export function GalleryCardSkeleton({
  category = "cards",
}: {
  category?: ComponentCategory;
}) {
  const height = GALLERY_SKELETON_HEIGHT[category] ?? 220;

  return (
    <div className="mb-[14px] block w-full shrink-0 break-inside-avoid" aria-hidden>
      <GalleryCardFrame>
        <GalleryMediaSkeleton category={category} minHeight={height} />
      </GalleryCardFrame>
    </div>
  );
}
