import type { TweakArrayItem, TweakControl, TweakControlType } from "./types";

const CONTROL_TYPE_MAP: Record<string, TweakControlType> = {
  Color: "color",
  Enum: "enum",
  Boolean: "boolean",
  Number: "number",
  String: "string",
  Array: "array",
};

/**
 * Framer control types we can surface in the marketplace tweak panel.
 * Everything else (Font, Padding, Image, Link, …) is skipped at parse time.
 */
const SUPPORTED_FRAMER_TYPES = new Set(Object.keys(CONTROL_TYPE_MAP));

function parseScalarDefault(raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractControlsBlock(source: string): string | null {
  const marker = source.search(/addPropertyControls\s*\(/);
  if (marker === -1) return null;

  const open = source.indexOf("{", source.indexOf("(", marker));
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  return null;
}

/** Split a `{ key: { ... }, ... }` block into top-level entries only. */
function extractTopLevelEntries(body: string): { key: string; entry: string }[] {
  const entries: { key: string; entry: string }[] = [];
  let i = 0;

  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;

    const rest = body.slice(i);
    const keyMatch = rest.match(/^([a-zA-Z_][\w]*)\s*:\s*\{/);
    if (!keyMatch) break;

    const key = keyMatch[1];
    const openBrace = i + keyMatch[0].length - 1;
    let depth = 0;
    let closeBrace = openBrace;

    for (let j = openBrace; j < body.length; j++) {
      const ch = body[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          closeBrace = j;
          break;
        }
      }
    }

    if (depth !== 0) break;

    entries.push({ key, entry: body.slice(openBrace + 1, closeBrace) });
    i = closeBrace + 1;
  }

  return entries;
}

function extractNestedBlock(entry: string, label: string): string | null {
  const marker = entry.search(new RegExp(`${label}\\s*:\\s*\\{`));
  if (marker === -1) return null;

  const open = entry.indexOf("{", marker);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < entry.length; i++) {
    const ch = entry[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return entry.slice(open + 1, i);
    }
  }

  return null;
}

function parseValueAt(entry: string, start: number): unknown {
  let i = start;
  while (i < entry.length && /\s/.test(entry[i])) i++;
  if (i >= entry.length) return undefined;

  const ch = entry[i];

  if (ch === '"' || ch === "'") {
    const quote = ch;
    let j = i + 1;
    let value = "";
    while (j < entry.length) {
      if (entry[j] === "\\" && j + 1 < entry.length) {
        value += entry[j + 1];
        j += 2;
        continue;
      }
      if (entry[j] === quote) return value;
      value += entry[j];
      j++;
    }
    return value;
  }

  if (entry.startsWith("true", i)) return true;
  if (entry.startsWith("false", i)) return false;

  const numMatch = entry.slice(i).match(/^-?\d+(?:\.\d+)?/);
  if (numMatch) return Number(numMatch[0]);

  if (ch === "[") {
    let depth = 0;
    let end = i;
    for (let j = i; j < entry.length; j++) {
      if (entry[j] === "[") depth++;
      else if (entry[j] === "]") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    const slice = entry.slice(i, end + 1);
    const jsonish = slice
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(jsonish) as unknown;
    } catch {
      return [];
    }
  }

  return undefined;
}

function parseDefaultValue(entry: string): unknown {
  let depth = 0;
  for (let i = 0; i < entry.length; i++) {
    const ch = entry[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (depth === 0 && entry.slice(i).match(/^defaultValue\s*:/)) {
      const colon = entry.indexOf(":", i);
      return parseValueAt(entry, colon + 1);
    }
  }
  return undefined;
}

function parseFramerType(entry: string): string | null {
  const typeMatch =
    entry.match(/type:\s*ControlType\.(\w+)/) ??
    entry.match(/type:\s*\(ControlType\s+as\s+[^)]+\)\.(\w+)/);
  return typeMatch?.[1] ?? null;
}

function parseControlEntry(key: string, entry: string): TweakControl | null {
  const framerType = parseFramerType(entry);
  if (!framerType || !SUPPORTED_FRAMER_TYPES.has(framerType)) return null;

  const titleMatch = entry.match(/title:\s*["']([^"']+)["']/);
  const minMatch = entry.match(/min:\s*(-?[\d.]+)/);
  const maxMatch = entry.match(/max:\s*(-?[\d.]+)/);
  const stepMatch = entry.match(/step:\s*(-?[\d.]+)/);
  const unitMatch = entry.match(/unit:\s*["']([^"']+)["']/);
  const optionsMatch = entry.match(/options:\s*\[([^\]]+)\]/);

  const mapped = CONTROL_TYPE_MAP[framerType];
  const parsedDefault = parseDefaultValue(entry);

  if (mapped === "array") {
    const controlBlock = extractNestedBlock(entry, "control");
    const itemsBody = controlBlock ? extractNestedBlock(controlBlock, "controls") : null;
    const items = itemsBody
      ? extractTopLevelEntries(itemsBody)
          .map((item) => parseControlEntry(item.key, item.entry))
          .filter((c): c is TweakControl => c !== null)
      : [];

    const defaultItems = Array.isArray(parsedDefault)
      ? (parsedDefault as TweakArrayItem[])
      : [];

    return {
      key,
      label: titleMatch?.[1] ?? key,
      type: "array",
      default: defaultItems,
      items,
      hidden: true,
    };
  }

  const control: TweakControl = {
    key,
    label: titleMatch?.[1] ?? key,
    type: mapped,
    default:
      parsedDefault !== undefined
        ? (parsedDefault as string | number | boolean)
        : mapped === "boolean"
          ? false
          : mapped === "number"
            ? 0
            : "",
  };

  if (mapped === "number") {
    if (minMatch) control.min = Number(minMatch[1]);
    if (maxMatch) control.max = Number(maxMatch[1]);
    if (stepMatch) control.step = Number(stepMatch[1]);
    if (unitMatch) control.unit = unitMatch[1];
  }

  if (mapped === "enum" && optionsMatch) {
    control.options = [...optionsMatch[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  }

  return control;
}

/** Controls rendered in the tweak panel and props documentation. */
export function isTweakableControl(control: TweakControl): boolean {
  return !control.hidden;
}

/** Filter schema to user-facing controls only. */
export function tweakableSchema(schema: TweakControl[]): TweakControl[] {
  return schema.filter(isTweakableControl);
}

/**
 * Best-effort parser for Framer `addPropertyControls` blocks.
 * Only reads top-level controls — nested Object/Array item fields are not flattened.
 * Framer-only types (Font, Padding, Image, Link, …) are omitted.
 */
export function parsePropertyControls(source: string): TweakControl[] {
  const body = extractControlsBlock(source);
  if (!body) return [];

  return extractTopLevelEntries(body)
    .map(({ key, entry }) => parseControlEntry(key, entry))
    .filter((control): control is TweakControl => control !== null);
}
