import type { CSSProperties } from "react";
import type { ComponentCategory, PreviewLayout, RegistryEntry, TweakState } from "@compify/shared";

export type PreviewSurface = "gallery" | "detail" | "variant";

export type PreviewFrameConfig = {
  /** CSS aspect-ratio value, e.g. "3 / 2". */
  aspectRatio?: string;
  minHeight?: number;
  /** Fixed detail frame (repeat-image-hover). */
  width?: number;
  height?: number;
  /** Uniform stage padding (px); overridden by paddingX / paddingY when set. */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Stretch component to fill the frame (default true when aspect ratio is set). */
  fill?: boolean;
  /** Center content when not filling the frame. */
  center?: boolean;
  /** Clip overflow inside the frame (default true). Set false for effects that extend outside the box. */
  clip?: boolean;
};

type PreviewPropsFn = (state: TweakState) => TweakState;

type ComponentPreviewSpec = {
  gallery: PreviewFrameConfig;
  detail: PreviewFrameConfig;
  variant?: PreviewFrameConfig;
  props?: Partial<Record<PreviewSurface, PreviewPropsFn>>;
};

/** Per-component preview framing and prop overrides — single source of truth. */
const COMPONENT_PREVIEW: Record<string, ComponentPreviewSpec> = {
  lightning: {
    gallery: { aspectRatio: "3 / 2" },
    detail: { aspectRatio: "3 / 2", fill: true },
    props: {
      gallery: (s) => ({ ...s, preview: true, animation: true, gallery: true }),
      detail: (s) => ({ ...s, preview: true }),
    },
  },
  snowfall: {
    gallery: { aspectRatio: "7 / 4" },
    detail: { aspectRatio: "7 / 4", fill: true },
    props: {
      gallery: (s) => ({ ...s, preview: true, gallery: true }),
      detail: (s) => ({ ...s, preview: true }),
    },
  },
  "before-after-slider": {
    gallery: { aspectRatio: "76 / 44" },
    detail: { aspectRatio: "76 / 44", fill: true },
    props: {
      gallery: (s) => ({ ...s, gallery: true, initialPosition: 42 }),
      detail: (s) => s,
    },
  },
  "repeat-image-hover": {
    gallery: { aspectRatio: "250 / 360", fill: true, paddingX: 20, paddingY: 4 },
    detail: { width: 250, height: 360, center: true, paddingX: 24, paddingY: 4 },
    variant: { aspectRatio: "250 / 360", fill: true, center: true, paddingX: 10, paddingY: 4 },
    props: {
      gallery: (s) =>
        stripRepeatDims(s, {
          preview: true,
          width: "100%",
          height: "100%",
          gallery: true,
          borderRadius: 140,
          layers: 3,
          frontScale: 0.76,
          scaleStep: 0.12,
        }),
      detail: (s) => stripRepeatDims(s, { preview: true, width: 250, height: 360 }),
      variant: (s) =>
        stripRepeatDims(s, {
          preview: true,
          width: "100%",
          height: "100%",
          gallery: true,
          borderRadius: 100,
          layers: 3,
          frontScale: 0.76,
          scaleStep: 0.12,
        }),
    },
  },
  animatedbars: {
    gallery: { minHeight: 140, fill: true, paddingX: 20, paddingY: 20 },
    detail: { minHeight: 200, fill: true, paddingX: 24, paddingY: 24 },
    variant: { minHeight: 152, fill: true, paddingX: 12, paddingY: 12 },
    props: {
      gallery: (s) =>
        ({
          ...s,
          preview: true,
          bars: [{ label: "Instagram", percent: 48, color: "#e1306c" }],
          barHeight: 34,
          gap: 12,
          padding: "0px",
          labelFont: { fontSize: 14, fontWeight: 500 },
          numberFont: { fontSize: 20, fontWeight: 800 },
        }) as unknown as TweakState,
      detail: (s) => ({ ...s, padding: "0px" }) as unknown as TweakState,
      variant: (s) =>
        ({
          ...s,
          preview: true,
          bars: [{ label: "Instagram", percent: 48, color: "#e1306c" }],
          barHeight: 24,
          gap: 10,
          padding: "0px",
          labelFont: { fontSize: 12, fontWeight: 500 },
          numberFont: { fontSize: 16, fontWeight: 800 },
        }) as unknown as TweakState,
    },
  },
  "shiny-button": {
    gallery: { minHeight: 160, fill: false, center: true, paddingY: 24, paddingX: 16 },
    detail: { minHeight: 160, fill: false, center: true, paddingY: 32, paddingX: 16 },
  },
  "text-lift": {
    gallery: {
      minHeight: 160,
      fill: false,
      center: true,
      clip: false,
      paddingY: 28,
      paddingX: 24,
    },
    detail: {
      minHeight: 280,
      fill: false,
      center: true,
      clip: false,
      paddingY: 40,
      paddingX: 32,
    },
    variant: {
      minHeight: 152,
      fill: false,
      center: true,
      clip: false,
      paddingY: 16,
      paddingX: 12,
    },
    props: {
      gallery: (s) => textLiftPreviewProps(s, 56),
      detail: (s) => textLiftPreviewProps(s, 88, { preview: false }),
      variant: (s) => textLiftPreviewProps(s, 30),
    },
  },
  // Canvas/full-bleed components (width/height: 100%) need a definite framed box,
  // otherwise the canvas measures a content-sized parent and grows without bound.
  "pixel-card": {
    gallery: { aspectRatio: "3 / 4", fill: true, paddingX: 40, paddingY: 24 },
    detail: { aspectRatio: "3 / 4", fill: true, center: true, width: 300 },
    variant: { aspectRatio: "3 / 4", fill: true },
    props: {
      gallery: (s) => ({ ...s, preview: true }),
      detail: (s) => ({ ...s, preview: true }),
      variant: (s) => ({ ...s, preview: true }),
    },
  },
  "light-rays": {
    gallery: { aspectRatio: "3 / 2", fill: true },
    detail: { aspectRatio: "3 / 2", fill: true },
  },
  coverflow: {
    gallery: { aspectRatio: "16 / 9", fill: true },
    detail: { aspectRatio: "16 / 9", fill: true },
    variant: { minHeight: 152, fill: true },
    props: {
      gallery: (s) => coverflowInlineProps(s, COVERFLOW_GALLERY_SCALE),
      variant: (s) => coverflowInlineProps(s, COVERFLOW_VARIANT_SCALE),
    },
  },
};

const DEFAULT_FRAME: PreviewFrameConfig = { minHeight: 200 };
const DEFAULT_DETAIL_FRAME: PreviewFrameConfig = { minHeight: 200, center: true };

function stripRepeatDims(
  state: TweakState,
  overrides: TweakState,
): TweakState {
  const { width: _w, height: _h, preview: _p, ...rest } = state;
  return { ...rest, ...overrides };
}

/** Scaled coverflow for gallery cards (~16:9 masonry tiles). */
const COVERFLOW_GALLERY_SCALE = {
  activeWidth: 200,
  activeHeight: 128,
  restWidth: 15,
  restHeight: 64,
  arrowSize: 32,
  gap: 8,
  edgeFade: 48,
  falloffRange: 4,
} as const;

/** Scaled coverflow for the 152px variant grid. */
const COVERFLOW_VARIANT_SCALE = {
  activeWidth: 110,
  activeHeight: 70,
  restWidth: 8,
  restHeight: 35,
  arrowSize: 20,
  gap: 4,
  edgeFade: 28,
  falloffRange: 3,
} as const;

function coverflowInlineProps(
  state: TweakState,
  scale?: Record<string, number>,
): TweakState {
  return {
    ...state,
    width: "100%",
    height: "100%",
    drag: false,
    autoplay: false,
    reflection: false,
    ...(scale ?? {}),
  } as TweakState;
}

function textLiftPreviewProps(
  state: TweakState,
  fontSize: number,
  options?: { preview?: boolean },
): TweakState {
  const userSize = Number(state.fontSize);
  const resolvedSize =
    Number.isFinite(userSize) && userSize > 0 ? userSize : fontSize;
  return {
    ...state,
    preview: options?.preview ?? true,
    fontSize: options?.preview === false ? resolvedSize : fontSize,
  } as TweakState;
}

function specFor(name: string): ComponentPreviewSpec | undefined {
  return COMPONENT_PREVIEW[name];
}

export function previewSurfaceConfig(name: string, surface: PreviewSurface): PreviewFrameConfig {
  const spec = specFor(name);
  if (!spec) {
    return surface === "detail" ? DEFAULT_DETAIL_FRAME : DEFAULT_FRAME;
  }
  if (surface === "variant") {
    return spec.variant ?? spec.gallery;
  }
  return spec[surface];
}

export function previewPropsForSurface(
  name: string,
  state: TweakState,
  surface: PreviewSurface,
): TweakState {
  const transform = specFor(name)?.props?.[surface];
  return transform ? transform(state) : state;
}

/** @deprecated Use previewSurfaceConfig(name, "gallery") */
export type GalleryFrame = Pick<PreviewFrameConfig, "aspectRatio" | "minHeight">;

export function galleryFrameFor(name: string): GalleryFrame {
  const { aspectRatio, minHeight } = previewSurfaceConfig(name, "gallery");
  return { aspectRatio, minHeight };
}

export function hasGalleryFrame(name: string): boolean {
  const { aspectRatio, minHeight, width, height } = previewSurfaceConfig(name, "gallery");
  return Boolean(aspectRatio || minHeight || width || height);
}

export function hasDetailFixedFrame(name: string): boolean {
  const { width, height } = previewSurfaceConfig(name, "detail");
  return width != null && height != null;
}

export function detailFixedFrameFor(name: string): { width: number; height: number } | undefined {
  const { width, height } = previewSurfaceConfig(name, "detail");
  if (width == null || height == null) return undefined;
  return { width, height };
}

export const STAGE_PADDING_X = 0;
export const STAGE_PADDING_Y = 0;

/** Default preview stage padding — edge-to-edge; components opt into padding via
 *  their per-surface paddingX/paddingY in COMPONENT_PREVIEW. */
export const DETAIL_PREVIEW_PADDING = 0;

/** Minimum height for the detail-page preview stage so small components (a lone
 *  button, a short bar) still get a comfortable preview area. Taller components
 *  exceed it, so it only affects the small ones. */
export const DETAIL_STAGE_MIN_HEIGHT = 360;

export function stagePaddingStyle(
  frame: Pick<PreviewFrameConfig, "padding" | "paddingX" | "paddingY">,
  fallback = DETAIL_PREVIEW_PADDING,
): { padding: string } {
  const y = frame.paddingY ?? frame.padding ?? fallback;
  const x = frame.paddingX ?? frame.padding ?? fallback;
  return { padding: `${y}px ${x}px` };
}

/** Section-scale components that should fill the preview stage. */
const FULL_LAYOUT_NAMES = new Set<string>();

const CENTERED_CATEGORIES = new Set<ComponentCategory>([]);

/** Resolve how a component is framed in the preview stage. */
export function resolvePreviewLayout(
  entry: Pick<RegistryEntry, "name" | "category" | "previewLayout">,
): PreviewLayout {
  if (FULL_LAYOUT_NAMES.has(entry.name)) return "full";
  if (entry.category === "animation" && entry.name !== "scroll-reveal") return "centered";
  if (CENTERED_CATEGORIES.has(entry.category)) return "centered";
  return entry.previewLayout ?? "full";
}

export function stageBackground(_accent: string, _layout: PreviewLayout): CSSProperties {
  return { background: "#000000" };
}

/** Detail page preview props from tweak panel state. */
export function previewPropsFor(name: string, state: TweakState): TweakState {
  return previewPropsForSurface(name, state, "detail");
}

/** Gallery card preview props from registry defaults. */
export function galleryPreviewProps(
  entry: Pick<RegistryEntry, "name">,
  state: TweakState,
): TweakState {
  return previewPropsForSurface(entry.name, state, "gallery");
}

/** Sidebar variant grid preview props. */
export function variantPreviewProps(
  entry: Pick<RegistryEntry, "name">,
  state: TweakState,
): TweakState {
  return previewPropsForSurface(entry.name, state, "variant");
}
