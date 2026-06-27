/**
 * Shared type definitions for the Compify UI registry, tweak panel,
 * and MCP server. These types are the contract between the component
 * library, the marketplace website, and the MCP delivery layer.
 */

/** The built-in categories shipped with the app. */
export type KnownComponentCategory =
  | "hero"
  | "navbar"
  | "pricing"
  | "cards"
  | "forms"
  | "animation"
  | "data";

/**
 * A component's category. Built-in categories give editor autocomplete, but
 * admins can also create custom categories (any slug), so this accepts any
 * string. Use `categoryLabel()` to render a display label for either kind.
 */
export type ComponentCategory = KnownComponentCategory | (string & {});

export type StackName = "framer" | "react" | "nextjs" | "vite";
export type StylingName = "css" | "tailwind" | "cssmodules";
export type PreviewLayout = "full" | "centered";

/**
 * Every Framer `ControlType`, lowercased to match the values our `framer` shim
 * emits at runtime (the shim maps `ControlType.Font` -> "font", etc.). Some are
 * editable in the tweak panel; a few (componentinstance/slot/eventhandler) are
 * extracted for defaults only and have no panel UI outside Framer.
 */
export type TweakControlType =
  | "color"
  | "enum"
  | "segmentedenum"
  | "boolean"
  | "number"
  | "string"
  | "richtext"
  | "object"
  | "array"
  | "image"
  | "responsiveimage"
  | "file"
  | "link"
  | "date"
  | "transition"
  | "font"
  | "padding"
  | "borderradius"
  | "border"
  | "boxshadow"
  | "cursor"
  | "fusednumber"
  | "componentinstance"
  | "slot"
  | "eventhandler";

export type TweakScalar = string | number | boolean;
/** A JSON-serializable object value (font/transition/object/responsive image). */
export type TweakObject = { [key: string]: TweakValue };
/**
 * Any value a control can hold. Scalars for simple controls; objects for
 * font/transition/object/responsive-image; arrays of rows (objects or scalars)
 * for array controls. Always JSON-serializable — non-serializable Framer values
 * (functions, React nodes) are stripped during extraction.
 */
export type TweakValue = TweakScalar | null | TweakValue[] | TweakObject;
/** @deprecated An array row is just a `TweakObject`; kept for back-compat. */
export type TweakArrayItem = TweakObject;

/** Runtime value shape for `font` controls. */
export interface FontValue {
  fontFamily?: string;
  /** Framer-style named weight/style, e.g. "Regular", "Bold", "Semibold". */
  variant?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  fontSize?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textAlign?: "left" | "center" | "right" | "justify";
}

/** Runtime value shape for `transition` controls (a framer-motion transition). */
export interface TransitionValue {
  type?: "spring" | "tween" | "inertia";
  stiffness?: number;
  damping?: number;
  mass?: number;
  duration?: number;
  bounce?: number;
  delay?: number;
  ease?: string | number[];
}

/** Runtime value shape for `responsiveimage` controls. */
export interface ResponsiveImageValue {
  src?: string;
  srcSet?: string;
  alt?: string;
  positionX?: string | number;
  positionY?: string | number;
}

/** Runtime value shape for `border` controls. */
export interface BorderValue {
  borderWidth?: number | string;
  borderTopWidth?: number | string;
  borderRightWidth?: number | string;
  borderBottomWidth?: number | string;
  borderLeftWidth?: number | string;
  borderStyle?: "solid" | "dashed" | "dotted" | "double";
  borderColor?: string;
}

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
  /** Field schema for `array`-of-object rows. */
  items?: TweakControl[];
  /** Single item control for `array`-of-scalar controls. */
  itemControl?: TweakControl;
  /** Field schema for `object` controls. */
  controls?: TweakControl[];
  /** Options for `enum` / `segmentedenum` controls. */
  options?: string[];
  /** Display labels parallel to `options`. */
  optionTitles?: string[];
  /** Render an enum as a segmented control rather than a dropdown. */
  segmented?: boolean;
  /** Bounds + step for `number` controls. */
  min?: number;
  max?: number;
  step?: number;
  /** Unit suffix shown next to numeric sliders, e.g. "px". */
  unit?: string;
  /** Max rows for `array` controls. */
  maxCount?: number;
  /** Placeholder text for text-like controls. */
  placeholder?: string;
  /** Help text shown under the control. */
  description?: string;
  /** Font control sub-mode ("basic" | "extended"). */
  fontControls?: "basic" | "extended";
  /** Framer's `defaultFontType` hint (sans-serif/serif/monospace). */
  defaultFontType?: string;
  /** Optional grouping label for organizing the panel. */
  group?: string;
  /** Parsed for preview defaults only — hidden from tweak panel and props docs. */
  hidden?: boolean;
  /**
   * Framer's conditional-visibility predicate (`hidden: (props, root) => bool`).
   * Client-only and NOT serialized (JSON drops functions) — attached only when
   * controls are read live from the module, so the panel can hide a control
   * based on sibling values exactly like Framer. `scope` is the local props
   * (the object's value for object fields / row for array items; the full state
   * for top-level controls); `root` is always the full top-level tweak state —
   * nested controls commonly key off it (e.g. a sub-direction that depends on a
   * top-level orientation).
   */
  hiddenWhen?: (
    scope: Record<string, unknown>,
    root: Record<string, unknown>,
  ) => boolean;
  /**
   * False for controls whose value can't be edited outside Framer
   * (componentinstance, slot, eventhandler). They still carry a default so the
   * component renders, but get no panel UI.
   */
  editable?: boolean;
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
  /** Admin-curated "Featured" marker — surfaces the component in the Featured
   *  view. Absent on filesystem/MCP entries. */
  featured?: boolean;
  /** Path (relative to repo root) of the component source file. */
  sourcePath: string;
  /** Public path to a static gallery thumbnail, e.g. "/thumbnails/hero.png". */
  thumbnail?: string;
  /** Uploaded media (image or video URL) shown on the gallery card in place of
   *  the live preview. Rendered full-width; height follows its aspect ratio. */
  galleryMedia?: string;
  /** Uploaded media (image or video URL) shown on the variant tile in place of
   *  the live preview. Rendered full-width; height follows its aspect ratio. */
  variantMedia?: string;
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
  /**
   * Admin-curated default tweak state (prop key -> value). When set, the live
   * site initializes the control panel — and every default render of the
   * component (detail stage, gallery card, variant tile, Copy) — from these
   * values instead of the component's own Framer control defaults. Keys absent
   * here fall back to each control's `default`, so it tolerates schema drift.
   */
  previewDefaults?: TweakState;
}

export type PreviewSurfaceName = "gallery" | "detail" | "variant";

export interface PreviewSurfaceLayout {
  /**
   * "center" = natural size, centered; "fill" = stretch to fill the stage
   * (centered); "fit" = scale the whole component down to fit, centered.
   */
  fit?: "auto" | "center" | "fill" | "fit";
  /** Stage/card preview height in px. */
  minHeight?: number;
  /** Cap the component width in px (applies when centered). */
  maxWidth?: number;
  /** Inner padding around the component in px. */
  padding?: number;
  /** Vertical alignment of the component within the stage. */
  align?: "top" | "center" | "bottom";
  /** Scale multiplier for the component (1 = 100%). Useful for sizing small
   *  intrinsic components like buttons; ignored when covering. */
  scale?: number;
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
