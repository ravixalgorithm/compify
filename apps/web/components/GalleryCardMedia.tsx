"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistryEntry } from "@compify/shared";
import { GALLERY_USE_THUMBNAILS, componentThumbnail } from "@/lib/thumbnails";
import { previewSurfaceConfig } from "@/lib/preview";
import { useInView } from "@/lib/useInView";
import { GalleryInlinePreview } from "./GalleryInlinePreview";
import { GalleryMediaSkeleton } from "./GalleryCardSkeleton";

type LoadState = "idle" | "loading" | "loaded" | "error";

export function GalleryCardMedia({
  entry,
  alt,
  priority = false,
}: {
  entry: RegistryEntry;
  alt: string;
  priority?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(priority ? "0px" : "320px 0px");
  const imgRef = useRef<HTMLImageElement>(null);
  const src = componentThumbnail(entry);
  const shouldLoad = priority || inView;
  const useThumbnails = GALLERY_USE_THUMBNAILS;

  const [state, setState] = useState<LoadState>(() => (useThumbnails ? "idle" : "error"));
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    if (!useThumbnails || !shouldLoad) return;
    setState((prev) => (prev === "loaded" ? prev : "loading"));
  }, [shouldLoad, src, useThumbnails]);

  useEffect(() => {
    if (!useThumbnails) return;
    const img = imgRef.current;
    if (!img || !shouldLoad) return;

    if (img.complete) {
      setState(img.naturalWidth > 0 ? "loaded" : "error");
    }
  }, [shouldLoad, src, useThumbnails]);

  const showImage = useThumbnails && shouldLoad && state !== "error";
  const showLivePreview = shouldLoad && (!useThumbnails || state === "error");

  useEffect(() => {
    if (!showLivePreview) setPreviewReady(false);
  }, [showLivePreview]);

  const frame = previewSurfaceConfig(entry.name, "gallery", entry.previewSurfaces?.gallery);
  const skeletonMinHeight = frame.minHeight ?? 200;

  const showSkeleton =
    !shouldLoad ||
    (showImage && state !== "loaded") ||
    (showLivePreview && !previewReady);

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-bg">
      {showSkeleton ? (
        <GalleryMediaSkeleton
          category={entry.category}
          minHeight={skeletonMinHeight}
          aspectRatio={frame.aspectRatio}
        />
      ) : null}

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`block h-auto w-full transition-opacity duration-300 ${
            state === "loaded"
              ? "opacity-100"
              : "pointer-events-none absolute inset-x-0 top-0 opacity-0"
          }`}
        />
      ) : null}

      {showLivePreview ? (
        <div
          className={
            previewReady
              ? ""
              : "pointer-events-none invisible absolute h-0 w-full overflow-hidden"
          }
        >
          <GalleryInlinePreview
            entry={entry}
            onReady={() => setPreviewReady(true)}
          />
        </div>
      ) : null}
    </div>
  );
}
