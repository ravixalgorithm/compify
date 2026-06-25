"use client";

import { cn } from "@/lib/cn";

/** True when a URL points at a video file we should render with <video>. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url);
}

/**
 * Uploaded gallery/variant thumbnail. The container width is fixed by the
 * surface, so the media simply fills the width (`w-full`) and its height follows
 * its own aspect ratio (`h-auto`). Videos autoplay muted + looped so the card
 * animates like the live preview did.
 */
export function MediaThumb({
  src,
  alt,
  className,
  onReady,
}: {
  src: string;
  alt: string;
  className?: string;
  onReady?: () => void;
}) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        className={cn("block h-auto w-full", className)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={onReady}
        aria-label={alt}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      className={cn("block h-auto w-full", className)}
      onLoad={onReady}
    />
  );
}
