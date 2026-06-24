"use client";

import { Component, useEffect, useMemo } from "react";
import type { RegistryEntry } from "@compify/shared";
import { getLibraryComponent } from "@compify/library";
import { cn } from "@/lib/cn";
import {
  galleryPreviewProps,
  previewSurfaceConfig,
  stagePaddingStyle,
  type PreviewSurface,
  variantPreviewProps,
} from "@/lib/preview";

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 font-mono text-[13px] text-red-300">
          Preview error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function propsForSurface(
  entry: Pick<RegistryEntry, "name">,
  defaults: Record<string, unknown>,
  surface: PreviewSurface,
) {
  const state = defaults as Parameters<typeof galleryPreviewProps>[1];
  if (surface === "variant") return variantPreviewProps(entry, state);
  return galleryPreviewProps(entry, state);
}

/** Live component preview — gallery cards and sidebar variant grid. */
export function GalleryInlinePreview({
  entry,
  onReady,
  surface = "gallery",
}: {
  entry: RegistryEntry;
  onReady?: () => void;
  surface?: PreviewSurface;
}) {
  const defaults = useMemo(
    () => Object.fromEntries(entry.tweakSchema.map((control) => [control.key, control.default])),
    [entry],
  );

  const componentProps = propsForSurface(entry, defaults, surface);
  const LibraryComponent = getLibraryComponent(entry.name);
  const frame = previewSurfaceConfig(entry.name, surface);
  const fixed = frame.width != null && frame.height != null;
  const fill = frame.fill ?? Boolean(frame.aspectRatio || fixed);
  const stagePad = stagePaddingStyle(frame, 0);
  const framedHeight = fill && !frame.aspectRatio && !fixed && !frame.center;
  const centeredAspect = Boolean(frame.center && frame.aspectRatio && !fixed);
  const centerInFrame = !fill && !centeredAspect;
  const clip = frame.clip !== false;

  useEffect(() => {
    if (!LibraryComponent) {
      onReady?.();
      return;
    }
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [LibraryComponent, onReady]);

  if (!LibraryComponent) {
    return (
      <div className="p-6 text-center font-mono text-[13px] text-muted">
        Unknown component: {entry.name}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none relative w-full bg-black",
        (framedHeight || centeredAspect) && "h-full",
        centeredAspect && "flex items-center justify-center",
      )}
    >
      <PreviewErrorBoundary>
        <div
          className={cn(
            centeredAspect ? "h-full max-w-full" : "w-full",
            framedHeight && "h-full",
          )}
          style={stagePad}
        >
          <div
            className={cn(
              "relative",
              clip ? "overflow-hidden" : "overflow-visible",
              framedHeight && "h-full w-full",
              centeredAspect && "h-full",
              centerInFrame && "flex items-center justify-center",
            )}
            style={
              centeredAspect
                ? { aspectRatio: frame.aspectRatio, width: "auto", maxWidth: "100%" }
                : {
                    aspectRatio: fixed
                      ? `${frame.width} / ${frame.height}`
                      : frame.aspectRatio,
                    minHeight: frame.minHeight,
                  }
            }
          >
            {fill ? (
              <div className="size-full">
                <LibraryComponent {...componentProps} />
              </div>
            ) : (
              <LibraryComponent {...componentProps} />
            )}
          </div>
        </div>
      </PreviewErrorBoundary>
    </div>
  );
}
