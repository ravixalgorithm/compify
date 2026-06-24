"use client";

import { Component, useEffect, useMemo } from "react";
import type { RegistryEntry } from "@compify/shared";
import { getLibraryComponent } from "@compify/library";
import { DynamicComponent } from "./DynamicComponent";
import { ScaleToFit } from "./ScaleToFit";
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
  state,
}: {
  entry: RegistryEntry;
  onReady?: () => void;
  surface?: PreviewSurface;
  /** Live tweak state. When omitted (live site), the component's defaults are used. */
  state?: Record<string, unknown>;
}) {
  const defaults = useMemo(
    () => Object.fromEntries(entry.tweakSchema.map((control) => [control.key, control.default])),
    [entry],
  );

  const componentProps = propsForSurface(entry, state ?? defaults, surface);
  // DB-backed entries render their compiled module; others use the bundle.
  const moduleUrl = entry.compiledModuleUrl;
  const LibraryComponent = moduleUrl ? undefined : getLibraryComponent(entry.name);
  const hasComponent = Boolean(moduleUrl) || Boolean(LibraryComponent);
  const rendered = moduleUrl ? (
    <DynamicComponent moduleUrl={moduleUrl} componentProps={componentProps as Record<string, unknown>} />
  ) : LibraryComponent ? (
    <LibraryComponent {...componentProps} />
  ) : null;
  const frame = previewSurfaceConfig(entry.name, surface, entry.previewSurfaces?.[surface]);
  const contain = frame.contain ?? false;
  const fixed = frame.width != null && frame.height != null;
  const fill = frame.fill ?? Boolean(frame.aspectRatio || fixed);
  const stagePad = stagePaddingStyle(frame, 0);
  const framedHeight = fill && !frame.aspectRatio && !fixed && !frame.center;
  const centeredAspect = Boolean(frame.center && frame.aspectRatio && !fixed);
  const centerInFrame = !fill && !centeredAspect;
  const clip = frame.clip !== false;

  useEffect(() => {
    if (!hasComponent) {
      onReady?.();
      return;
    }
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [hasComponent, onReady]);

  if (!hasComponent) {
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
            {contain ? (
              <div className="relative w-full" style={{ height: frame.minHeight ?? 220 }}>
                <div className="absolute inset-0">
                  <ScaleToFit>{rendered}</ScaleToFit>
                </div>
              </div>
            ) : fill ? (
              <div className="flex size-full items-center justify-center">{rendered}</div>
            ) : (
              rendered
            )}
          </div>
        </div>
      </PreviewErrorBoundary>
    </div>
  );
}
