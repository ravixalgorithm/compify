"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentCategory } from "@compify/shared";
import { cn } from "@/lib/cn";
import { GalleryMediaSkeleton } from "./GalleryCardSkeleton";

/** True when a URL points at a video file we should render with <video>. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url);
}

/**
 * Uploaded gallery/variant thumbnail (image or video).
 *
 * Performance: nothing loads until the card nears the viewport, a shimmer
 * skeleton holds the space until the first frame is ready, and the media fades
 * in. Videos additionally play only while visible and pause when scrolled away,
 * so a long gallery never decodes dozens of clips at once.
 */
export function MediaThumb({
  src,
  alt,
  className,
  onReady,
  priority = false,
  category,
  aspectRatio,
  minHeight,
}: {
  src: string;
  alt: string;
  className?: string;
  onReady?: () => void;
  /** Above-the-fold media loads immediately instead of waiting for scroll. */
  priority?: boolean;
  category?: ComponentCategory;
  aspectRatio?: string;
  minHeight?: number;
}) {
  const isVideo = isVideoUrl(src);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [loaded, setLoaded] = useState(false);

  // One observer drives both lazy-load (latch shouldLoad on first approach) and,
  // for video, play/pause on every enter/leave so off-screen clips stay paused.
  useEffect(() => {
    // Eager image needs no observer; an eager video still wants play/pause.
    if (priority && !isVideo) return;
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting;
        if (visible) setShouldLoad(true);
        const video = videoRef.current;
        if (video) {
          if (visible) void video.play().catch(() => {});
          else video.pause();
        }
      },
      { rootMargin: priority ? "0px" : "320px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isVideo]);

  function handleReady() {
    setLoaded(true);
    onReady?.();
  }

  // Until loaded the media is positioned absolutely (no layout) over the
  // skeleton, which reserves the height; on load the skeleton drops and the
  // media takes its natural size — same swap GalleryCardMedia uses for images.
  const mediaClass = cn(
    "block h-auto w-full transition-opacity duration-300",
    loaded ? "opacity-100" : "pointer-events-none absolute inset-x-0 top-0 opacity-0",
    className,
  );

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden bg-bg">
      {!loaded ? (
        <GalleryMediaSkeleton
          category={category}
          minHeight={minHeight}
          aspectRatio={aspectRatio}
        />
      ) : null}

      {shouldLoad ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={src}
            className={mediaClass}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={handleReady}
            aria-label={alt}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className={mediaClass}
            onLoad={handleReady}
          />
        )
      ) : null}
    </div>
  );
}
