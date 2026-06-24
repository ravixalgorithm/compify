/**
 * Shared type definitions for the Compify UI registry, tweak panel,
 * and MCP server. These types are the contract between the component
 * library, the marketplace website, and the MCP delivery layer.
 */

export type ComponentCategory =
  | "hero"
  | "navbar"
  | "pricing"
  | "cards"
  | "forms"
  | "animation"
  | "data";

export type StackName = "framer" | "react" | "nextjs" | "vite";
export type StylingName = "css" | "tailwind" | "cssmodules";
export type PreviewLayout = "full" | "centered";

export type TweakControlType =
  | "color"
  | "enum"
  | "boolean"
  | "number"
  | "string"
  | "array";

export type TweakScalar = string | number | boolean;
export type TweakArrayItem = Record<string, TweakScalar>;
export type TweakValue = TweakScalar | TweakArrayItem[];

/**
 * A single control rendered in the website tweak panel. Each control maps
 * 1:1 to a prop on the underlying component.
 */
export interface TweakControl {
  /** Prop name on the component. */
  key: string;
  /** Label shown in the tweak panel. */
  label: string;
  type: TweakControlType;
  /** Default value — also the component's default prop value. */
  default: TweakValue;
  /** Item schema for `array` controls (Framer Array of Object). */
  items?: TweakControl[];
  /** Options for `enum` controls. */
  options?: string[];
  /** Bounds + step for `number` controls. */
  min?: number;
  max?: number;
  step?: number;
  /** Unit suffix shown next to numeric sliders, e.g. "px". */
  unit?: string;
  /** Optional grouping label for organizing the panel. */
  group?: string;
  /** Parsed for preview defaults only — hidden from tweak panel and props docs. */
  hidden?: boolean;
}

/**
 * One entry in `registry.json`. The registry is the single source of truth
 * shared by the marketplace website and the MCP server.
 */
export interface RegistryEntry {
  /** Slug identifier, e.g. "pricing-three-tier". */
  name: string;
  /** Human-readable name, e.g. "3-Tier Pricing". */
  displayName: string;
  category: ComponentCategory;
  /** One-line summary used on cards and the component page. */
  description: string;
  /** Optional multi-line intro paragraphs for the documentation block. */
  descriptionParagraphs?: string[];
  /** Bullet points shown under KEY FEATURES on the component page. */
  keyFeatures?: string[];
  tags: string[];
  /** npm packages the component depends on. */
  dependencies: string[];
  /** Controls rendered in the website tweak panel. */
  tweakSchema: TweakControl[];
  /** Which stack variants exist for this component. */
  variants: StackName[];
  premium: boolean;
  /** Path (relative to repo root) of the component source file. */
  sourcePath: string;
  /** Public path to a static gallery thumbnail, e.g. "/thumbnails/hero.png". */
  thumbnail?: string;
  /** Hosted Framer module URL — paste on canvas to insert, e.g. "https://framer.com/m/…". */
  framerModuleUrl?: string;
  /** Accent color used when a thumbnail image is missing. */
  previewAccent: string;
  /** How the live preview stage frames the component. */
  previewLayout?: PreviewLayout;
  /** Props documentation for the "Props" tab. */
  props: PropDoc[];
  /** Minimal usage snippet for the "Usage" tab. */
  usage: string;
  /** Slugs of related components. */
  related?: string[];
  /** Total copy count (social proof). Seeded for V1. */
  copyCount: number;
  /**
   * URL of the runtime-compiled ESM module (DB-backed components). When set,
   * previews render this module via DynamicComponent instead of the bundled
   * library component. Absent for filesystem/registry.json entries.
   */
  compiledModuleUrl?: string;
  /**
   * Admin-set framing for each preview surface (gallery card, detail stage,
   * variants grid). Overrides the built-in framing so the admin can position a
   * component per surface, and the choice is applied on the live site.
   */
  previewSurfaces?: Partial<Record<PreviewSurfaceName, PreviewSurfaceLayout>>;
}

export type PreviewSurfaceName = "gallery" | "detail" | "variant";

export interface PreviewSurfaceLayout {
  /** "center" = show at natural size, centered; "fill" = stretch to the stage. */
  fit?: "auto" | "center" | "fill";
  /** Stage/card preview height in px. */
  minHeight?: number;
  /** Cap the component width in px (applies when centered). */
  maxWidth?: number;
  /** Inner padding around the component in px. */
  padding?: number;
  /** Vertical alignment of the component within the stage. */
  align?: "top" | "center" | "bottom";
}

export interface PropDoc {
  name: string;
  type: string;
  default: string;
  description: string;
}

/** A resolved tweak state: prop key -> value. */
export type TweakState = Record<string, TweakValue>;

/** Parameters accepted by the MCP `get_component` tool. */
export interface GetComponentParams {
  name: string;
  stack?: StackName;
  styling?: StylingName;
  typescript?: boolean;
  tweaks?: TweakState;
}
