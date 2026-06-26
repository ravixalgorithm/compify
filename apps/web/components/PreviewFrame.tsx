"use client";

import { Component, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RiRefreshLine } from "@remixicon/react";
import type { PreviewLayout, PreviewSurfaceLayout, TweakState } from "@compify/shared";
import { getLibraryComponent } from "@compify/library";
import { DynamicComponent } from "./DynamicComponent";
import { ScaleToFit } from "./ScaleToFit";
import { cn } from "@/lib/cn";
import {
  DETAIL_PREVIEW_PADDING,
  DETAIL_STAGE_MIN_HEIGHT,
  PREVIEW_FIXED_WIDTH,
  previewPropsForSurface,
  previewSurfaceConfig,
  stageBackground,
  stagePaddingStyle,
} from "@/lib/preview";

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[PreviewFrame]", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            color: "#fca5a5",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
          }}
        >
          Preview error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function PreviewContent({
  name,
  componentProps,
  fill,
  center = false,
  contain = false,
  cover = false,
  scale = 1,
  moduleUrl,
}: {
  name: string;
  componentProps: TweakState;
  fill: boolean;
  center?: boolean;
  contain?: boolean;
  /** Stretch the component to the full stage width (height stays intrinsic). */
  cover?: boolean;
  /** Scale multiplier for the component (1 = 100%). */
  scale?: number;
  moduleUrl?: string;
}) {
  // Reload nonce — bumped by the reload button to remount the component (replays
  // its mount animations / resets its internal state) without a full page reload.
  const [reloadNonce, setReloadNonce] = useState(0);

  // DB-backed path: render the runtime-compiled module. Filesystem path
  // (no moduleUrl): render the bundled library component (unchanged behavior).
  const LibraryComponent = moduleUrl ? undefined : getLibraryComponent(name);
  // fill now CENTERS its content, so intrinsic-size components (buttons) sit in
  // the middle instead of pinned top-left, while size-full components still fill.
  const wrapperClass = cn(
    cover && "block w-full [&>*]:!w-full",
    !cover && fill && "flex size-full min-h-0 items-center justify-center",
    !cover && !fill && center && "flex w-full items-center justify-center",
    !cover && !fill && !center && "inline-flex max-w-full justify-center",
  );
  const inner = moduleUrl ? (
    <DynamicComponent moduleUrl={moduleUrl} componentProps={componentProps} />
  ) : LibraryComponent ? (
    <LibraryComponent key={componentProps.preview ? `${name}-showcase` : name} {...componentProps} />
  ) : null;

  // Size slider — scale the component about its center (no effect when covering).
  const scaleStyle =
    !cover && scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: "center center" }
      : undefined;

  return (
    <>
      {/* The nonce in the key remounts the component on reload — the button below
          is outside the boundary so it persists across reloads. */}
      <PreviewErrorBoundary key={`${moduleUrl ?? name}-${reloadNonce}`}>
        {inner === null ? null : contain ? (
          <ScaleToFit>{inner}</ScaleToFit>
        ) : (
          <div className={wrapperClass} style={scaleStyle}>{inner}</div>
        )}
        {inner === null ? (
          <div
            style={{
              padding: 24,
              color: "rgba(245,245,250,0.5)",
              fontFamily: "ui-monospace, monospace",
              textAlign: "center",
            }}
          >
            Unknown component: {name}
          </div>
        ) : null}
      </PreviewErrorBoundary>
      {inner !== null ? (
        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          aria-label="Reload preview"
          title="Reload preview"
          className="ui-press absolute right-2 top-2 z-20 flex size-7 items-center justify-center border border-panel-line bg-panel text-[#b8b8b8] transition hover:bg-field hover:text-white"
        >
          {/* One full spin per reload (rotate accumulates 360° each click). */}
          <motion.span
            className="flex"
            animate={{ rotate: reloadNonce * 360 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <RiRefreshLine size={14} />
          </motion.span>
        </button>
      ) : null}
    </>
  );
}

/** Preview stage — full width of the detail column; height from per-component config. */
export function PreviewFrame({
  name,
  state,
  previewAccent = "#7C3AED",
  previewLayout = "full",
  moduleUrl,
  surfaceLayout,
}: {
  name: string;
  state: TweakState;
  previewAccent?: string;
  previewLayout?: PreviewLayout;
  moduleUrl?: string;
  surfaceLayout?: PreviewSurfaceLayout;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const frame = previewSurfaceConfig(name, "detail", surfaceLayout);
  const stagePad = stagePaddingStyle(frame);
  const fixed = frame.width != null && frame.height != null;
  const contain = frame.contain ?? false;
  const hasAspect = frame.aspectRatio != null;
  // "Cover": the admin chose to stretch the component to the full stage width;
  // its own aspect ratio then sets the height (no fixed frame, no scaling).
  const cover = frame.fill === true && !hasAspect && !fixed && !contain;
  const framed = hasAspect && !cover;
  const fill = framed ? (frame.fill ?? !frame.center) : false;
  // Everything that isn't covering, fixed-size, scaled, or aspect-framed is
  // centered in the stage, so small components sit in the middle, not top-left.
  const center = frame.center ?? (!framed && !cover && !fixed && !contain);
  const clip = frame.clip !== false;
  // Pin the stage to a fixed width (centered) so the live detail page, the admin
  // preview, and the thumbnail capture all frame the component identically;
  // height stays content-driven.
  const stageStyle = {
    ...stageBackground(previewAccent, previewLayout),
    maxWidth: PREVIEW_FIXED_WIDTH,
    marginInline: "auto",
  };
  const componentProps = previewPropsForSurface(name, state, "detail");
  // Admin-controlled stage height + vertical alignment.
  const stageMinHeight = surfaceLayout?.minHeight ?? DETAIL_STAGE_MIN_HEIGHT;
  const scale = frame.scale ?? 1;
  const alignItems =
    frame.align === "top" ? "items-start" : frame.align === "bottom" ? "items-end" : "items-center";

  // "Fit": scale the whole component down to fit the stage, centered.
  if (contain) {
    return (
      <div
        className="relative w-full shrink-0"
        style={{ ...stagePad, ...stageStyle, minHeight: stageMinHeight }}
      >
        <div className="absolute inset-0 p-3">
          <PreviewContent
            name={name}
            componentProps={componentProps}
            fill={false}
            contain
            moduleUrl={moduleUrl}
          />
        </div>
      </div>
    );
  }

  if (fixed) {
    return (
      <div
        className={cn("relative flex w-full shrink-0 justify-center", alignItems)}
        style={{ ...stagePad, ...stageStyle, minHeight: stageMinHeight }}
      >
        <div
          ref={contentRef}
          className="relative w-full max-w-full overflow-hidden"
          style={{
            width: frame.width,
            maxWidth: "100%",
            aspectRatio: `${frame.width} / ${frame.height}`,
          }}
        >
          <PreviewContent name={name} componentProps={componentProps} fill={false} moduleUrl={moduleUrl} />
        </div>
      </div>
    );
  }

  // "Cover": the component spans the full stage width; its own aspect ratio sets
  // the height. Clipped to the stage so it can't overflow the container.
  if (cover) {
    return (
      <div
        className="relative flex w-full shrink-0 justify-center overflow-hidden"
        style={{ ...stagePad, ...stageStyle, minHeight: surfaceLayout?.minHeight }}
      >
        <div ref={contentRef} className="flex w-full justify-center">
          <PreviewContent
            name={name}
            componentProps={componentProps}
            fill={false}
            center
            moduleUrl={moduleUrl}
          />
        </div>
      </div>
    );
  }

  if (framed) {
    return (
      <div
        className={cn("relative w-full shrink-0", center && cn("flex justify-center", alignItems))}
        style={{ ...stagePad, ...stageStyle, minHeight: stageMinHeight }}
      >
        <div
          ref={contentRef}
          className={cn(
            "relative w-full",
            clip ? "overflow-hidden" : "overflow-visible",
            center && cn("mx-auto flex max-w-full justify-center", alignItems),
          )}
          style={{
            aspectRatio: frame.aspectRatio,
            minHeight: frame.minHeight,
            maxWidth: center ? frame.width : undefined,
          }}
        >
          {fill ? (
            <div className="absolute inset-0">
              <PreviewContent name={name} componentProps={componentProps} fill center={center} moduleUrl={moduleUrl} />
            </div>
          ) : (
            <PreviewContent
              name={name}
              componentProps={componentProps}
              fill={false}
              center={center}
              scale={scale}
              moduleUrl={moduleUrl}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden",
        center && cn("flex justify-center", alignItems),
      )}
      style={{
        padding: stagePad.padding,
        ...stageStyle,
        minHeight: stageMinHeight,
      }}
    >
      <div
        ref={contentRef}
        className={cn(center ? cn("flex w-full justify-center", alignItems) : "relative w-full")}
      >
        <PreviewContent name={name} componentProps={componentProps} fill={fill} center={center} scale={scale} moduleUrl={moduleUrl} />
      </div>
    </div>
  );
}
