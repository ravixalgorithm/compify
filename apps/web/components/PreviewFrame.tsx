"use client";

import { Component, useRef } from "react";
import type { PreviewLayout, TweakState } from "@compify/shared";
import { getLibraryComponent } from "@compify/library";
import { DynamicComponent } from "./DynamicComponent";
import { cn } from "@/lib/cn";
import {
  DETAIL_PREVIEW_PADDING,
  DETAIL_STAGE_MIN_HEIGHT,
  previewPropsForSurface,
  previewSurfaceConfig,
  stageBackground,
  stagePaddingStyle,
  STAGE_PADDING_X,
  STAGE_PADDING_Y,
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
  moduleUrl,
}: {
  name: string;
  componentProps: TweakState;
  fill: boolean;
  center?: boolean;
  moduleUrl?: string;
}) {
  // DB-backed path: render the runtime-compiled module. Filesystem path
  // (no moduleUrl): render the bundled library component (unchanged behavior).
  const LibraryComponent = moduleUrl ? undefined : getLibraryComponent(name);
  const wrapperClass = cn(
    fill && "size-full min-h-0",
    !fill && center && "flex w-full items-center justify-center",
    !fill && !center && "inline-flex max-w-full justify-center",
  );

  return (
    <PreviewErrorBoundary key={moduleUrl ?? name}>
      {moduleUrl ? (
        <div className={wrapperClass}>
          <DynamicComponent moduleUrl={moduleUrl} componentProps={componentProps} />
        </div>
      ) : LibraryComponent ? (
        <div className={wrapperClass}>
          <LibraryComponent
            key={componentProps.preview ? `${name}-showcase` : name}
            {...componentProps}
          />
        </div>
      ) : (
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
      )}
    </PreviewErrorBoundary>
  );
}

/** Preview stage — full width of the detail column; height from per-component config. */
export function PreviewFrame({
  name,
  state,
  previewAccent = "#7C3AED",
  previewLayout = "full",
  moduleUrl,
}: {
  name: string;
  state: TweakState;
  previewAccent?: string;
  previewLayout?: PreviewLayout;
  moduleUrl?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const frame = previewSurfaceConfig(name, "detail");
  const stagePad = stagePaddingStyle(frame);
  const fixed = frame.width != null && frame.height != null;
  const framed = Boolean(frame.aspectRatio || frame.minHeight);
  const fill = frame.fill ?? (framed && !frame.center);
  const center = frame.center ?? (!fill && previewLayout === "centered");
  const clip = frame.clip !== false;
  const stageStyle = stageBackground(previewAccent, previewLayout);
  const componentProps = previewPropsForSurface(name, state, "detail");

  if (fixed) {
    return (
      <div
        className="relative flex w-full shrink-0 items-center justify-center"
        style={{ ...stagePad, ...stageStyle, minHeight: DETAIL_STAGE_MIN_HEIGHT }}
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

  if (framed) {
    return (
      <div
        className={cn("relative w-full shrink-0", center && "flex items-center justify-center")}
        style={{ ...stagePad, ...stageStyle, minHeight: DETAIL_STAGE_MIN_HEIGHT }}
      >
        <div
          ref={contentRef}
          className={cn(
            "relative w-full",
            clip ? "overflow-hidden" : "overflow-visible",
            center && "mx-auto flex max-w-full items-center justify-center",
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
        "relative w-full shrink-0",
        center && "flex items-center justify-center",
      )}
      style={{
        padding: fill ? stagePad.padding : `${STAGE_PADDING_Y}px ${STAGE_PADDING_X}px`,
        ...stageStyle,
        minHeight: DETAIL_STAGE_MIN_HEIGHT,
      }}
    >
      <div
        ref={contentRef}
        className={cn(center ? "flex w-full items-center justify-center" : "relative w-full")}
      >
          <PreviewContent name={name} componentProps={componentProps} fill={fill} center={center} moduleUrl={moduleUrl} />
      </div>
    </div>
  );
}
