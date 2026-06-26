/**
 * Normalize a component's live `propertyControls` object into the tweak-panel
 * schema (`TweakControl[]`).
 *
 * Unlike the regex `parsePropertyControls` (which reads source text and can only
 * see literals), this runs on the EVALUATED controls object that our `framer`
 * shim attaches to the component during module evaluation. That gives us real
 * JS values: resolved consts, computed defaults, every control type, and the
 * actual nested Array/Object structure — with zero parsing fragility.
 *
 * Used in two places (same code, both sides):
 *  - server: after esbuild compile, the module is evaluated in Node and its
 *    `Component.propertyControls` is normalized and stored in the DB.
 *  - client: `DynamicComponent` reads `Comp.propertyControls` after load so the
 *    live panel always matches the actual component.
 *
 * Outside Framer there is no project to supply default fonts/transitions, so for
 * controls whose author relied on a Framer-supplied default we substitute our
 * own (FONT_DEFAULT / TRANSITION_DEFAULT / BORDER_DEFAULT). All output is
 * JSON-serializable — functions and React nodes are stripped.
 */

import type { TweakControl, TweakControlType, TweakObject, TweakValue } from "./types";

/** Lowercased Framer ControlType -> our normalized control type. */
const TYPE_ALIASES: Record<string, TweakControlType> = {
  color: "color",
  enum: "enum",
  segmentedenum: "enum", // deprecated Framer alias -> enum (rendered segmented)
  boolean: "boolean",
  number: "number",
  string: "string",
  richtext: "richtext",
  object: "object",
  array: "array",
  image: "image",
  responsiveimage: "responsiveimage",
  file: "file",
  link: "link",
  date: "date",
  transition: "transition",
  font: "font",
  padding: "padding",
  borderradius: "borderradius",
  border: "border",
  boxshadow: "boxshadow",
  cursor: "cursor",
  fusednumber: "fusednumber",
  componentinstance: "componentinstance",
  slot: "slot",
  eventhandler: "eventhandler",
};

/** Controls that have no editable representation outside Framer's canvas. */
const NON_EDITABLE = new Set<TweakControlType>([
  "componentinstance",
  "slot",
  "eventhandler",
]);

/**
 * Fallback defaults for controls whose author relied on a Framer-supplied
 * default (no `defaultValue` in source). Outside Framer there is no project
 * default, so the component renders with these instead.
 */
export const FONT_DEFAULT = {
  fontFamily: "Inter",
  variant: "Regular",
  fontWeight: 400,
  fontSize: "16px",
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
} as const;

/** Framer's documented runtime default transition (a spring). */
export const TRANSITION_DEFAULT = {
  type: "spring",
  stiffness: 800,
  damping: 60,
  mass: 1,
} as const;

export const BORDER_DEFAULT = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#000000",
} as const;

type RawControl = Record<string, unknown>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isReactElement(v: unknown): boolean {
  return isPlainObject(v) && "$$typeof" in v;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

/** Strip functions and React nodes; return a JSON-safe value or undefined. */
function sanitize(v: unknown): TweakValue | undefined {
  if (v === null) return null;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return v as TweakValue;
  if (t === "function") return undefined;
  if (Array.isArray(v)) {
    return v.map(sanitize).filter((x): x is TweakValue => x !== undefined);
  }
  if (isReactElement(v)) return undefined;
  if (isPlainObject(v)) {
    const out: TweakObject = {};
    for (const [k, val] of Object.entries(v)) {
      const s = sanitize(val);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return undefined;
}

function mergeObject(base: Record<string, unknown>, given: TweakValue | undefined): TweakObject {
  const extra = isPlainObject(given) ? (given as TweakObject) : {};
  return { ...base, ...extra } as TweakObject;
}

function defaultFor(type: TweakControlType, raw: RawControl): TweakValue {
  const given = sanitize(raw.defaultValue);
  switch (type) {
    case "boolean":
      return typeof given === "boolean" ? given : false;
    case "number":
      return typeof given === "number" ? given : (num(raw.min) ?? 0);
    case "color":
      return typeof given === "string" ? given : "#000000";
    case "font":
      return mergeObject(FONT_DEFAULT, given);
    case "transition":
      return mergeObject(TRANSITION_DEFAULT, given);
    case "border":
      return mergeObject(BORDER_DEFAULT, given);
    case "padding":
    case "borderradius":
      return typeof given === "string" ? given : "0px";
    case "boxshadow":
      return typeof given === "string" ? given : "";
    case "responsiveimage":
      return isPlainObject(given) ? given : { src: "", alt: "" };
    case "cursor":
      return typeof given === "string" ? given : "auto";
    case "array":
      return Array.isArray(given) ? given : [];
    case "object":
      return isPlainObject(given) ? given : {};
    case "enum": {
      if (typeof given === "string") return given;
      return strArray(raw.options)?.[0] ?? "";
    }
    case "image":
    case "file":
    case "link":
    case "date":
    case "richtext":
    case "string":
      return typeof given === "string" ? given : "";
    default:
      return given ?? null;
  }
}

function defaultsFromControls(controls: TweakControl[]): TweakObject {
  const obj: TweakObject = {};
  for (const c of controls) obj[c.key] = c.default;
  return obj;
}

interface NormalizeOpts {
  /** Attach Framer's `hidden` predicate fn for client-side conditional UI. */
  keepPredicates?: boolean;
}

function normalizeControl(
  key: string,
  rawUnknown: unknown,
  opts: NormalizeOpts,
): TweakControl | null {
  if (!isPlainObject(rawUnknown)) return null;
  const raw = rawUnknown as RawControl;
  const rawType = typeof raw.type === "string" ? raw.type.toLowerCase() : "";
  const type = TYPE_ALIASES[rawType];
  if (!type) return null;

  const control: TweakControl = {
    key,
    label: str(raw.title) ?? key,
    type,
    default: defaultFor(type, raw),
  };

  const description = str(raw.description);
  if (description) control.description = description;
  const placeholder = str(raw.placeholder);
  if (placeholder) control.placeholder = placeholder;
  if (raw.hidden === true) control.hidden = true;
  else if (opts.keepPredicates && typeof raw.hidden === "function") {
    control.hiddenWhen = raw.hidden as (scope: Record<string, unknown>) => boolean;
  }
  if (NON_EDITABLE.has(type)) {
    control.editable = false;
    control.hidden = true; // default-only, no panel UI outside Framer
  }

  switch (type) {
    case "number": {
      const min = num(raw.min);
      if (min !== undefined) control.min = min;
      const max = num(raw.max);
      if (max !== undefined) control.max = max;
      const step = num(raw.step);
      if (step !== undefined) control.step = step;
      const unit = str(raw.unit);
      if (unit) control.unit = unit;
      break;
    }
    case "enum": {
      const options = strArray(raw.options);
      if (options) control.options = options;
      const titles = strArray(raw.optionTitles);
      if (titles) control.optionTitles = titles;
      if (raw.displaySegmentedControl === true || rawType === "segmentedenum") {
        control.segmented = true;
      }
      break;
    }
    case "font": {
      const fc = str(raw.controls);
      if (fc === "basic" || fc === "extended") control.fontControls = fc;
      const dft = str(raw.defaultFontType);
      if (dft) control.defaultFontType = dft;
      break;
    }
    case "object": {
      const controls = normalizeMap(raw.controls, opts);
      control.controls = controls;
      if (
        !isPlainObject(control.default) ||
        Object.keys(control.default as object).length === 0
      ) {
        control.default = defaultsFromControls(controls);
      }
      break;
    }
    case "array": {
      const maxCount = num(raw.maxCount);
      if (maxCount !== undefined) control.maxCount = maxCount;
      const item = normalizeControl("item", raw.control, opts);
      if (item) {
        if (item.type === "object") {
          control.items = item.controls ?? [];
        } else {
          control.itemControl = item;
        }
      }
      break;
    }
    default:
      break;
  }

  return control;
}

function normalizeMap(raw: unknown, opts: NormalizeOpts): TweakControl[] {
  if (!isPlainObject(raw)) return [];
  const out: TweakControl[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const control = normalizeControl(key, value, opts);
    if (control) out.push(control);
  }
  return out;
}

/**
 * Normalize a component's live `propertyControls` object (attached by the framer
 * shim during module evaluation) into the tweak-panel schema. Returns `[]` if
 * the input isn't a controls object.
 *
 * Pass `{ keepPredicates: true }` on the client to attach Framer's `hidden`
 * functions (`control.hiddenWhen`) for conditional visibility. Omit it for the
 * stored/serialized schema — functions aren't JSON-safe.
 */
export function extractPropertyControls(
  propertyControls: unknown,
  opts: NormalizeOpts = {},
): TweakControl[] {
  return normalizeMap(propertyControls, opts);
}

/** Build a default tweak value for a fresh array row from its field schema. */
export function defaultArrayRow(items: TweakControl[]): TweakObject {
  return defaultsFromControls(items);
}
