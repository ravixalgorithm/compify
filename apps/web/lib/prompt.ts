import type { RegistryEntry, TweakControl, TweakScalar, TweakState } from "@compify/shared";
import { isTweakableControl } from "@compify/shared";
import { mcpUrl, type McpHost } from "@/lib/mcp";

/** Renders a single tweak value into a natural-language fragment. */
function describe(control: TweakControl, value: TweakScalar): string {
  const label = control.label.toLowerCase();
  switch (control.type) {
    case "enum":
      return `${value} ${label}`;
    case "boolean":
      return `${label} ${value ? "enabled" : "disabled"}`;
    case "color":
      return `${label} ${value}`;
    case "number":
      return `${value}${control.unit ?? ""} ${label}`;
    case "string":
    default:
      return `${label} "${value}"`;
  }
}

/**
 * Encodes the component + current tweak state into the natural-language prompt
 * pasted into Claude Code / Cursor / Codex. Only values that differ from the
 * schema defaults are included, keeping the prompt tight.
 */
export function encodePrompt(entry: RegistryEntry, tweaks: TweakState): string {
  const parts: string[] = [];
  for (const control of entry.tweakSchema) {
    if (!isTweakableControl(control)) continue;
    const value = tweaks[control.key];
    if (value === undefined || value === control.default) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }
    // Skip long free-text strings unless explicitly changed and short.
    if (control.type === "string" && String(value).length > 40) continue;
    parts.push(describe(control, value));
  }
  const tail = parts.length ? `, ${parts.join(", ")}` : "";
  return `Using compify-ui MCP, get me the ${entry.name} component${tail}.`;
}

export type Editor = "claude" | "cursor" | "codex";

export const EDITORS: { id: Editor; label: string }[] = [
  { id: "claude", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
];

/**
 * Returns the one-time MCP connection snippet for the given editor. Pass the
 * user's API key to embed it; otherwise a `<your-api-key>` placeholder is used.
 */
export function connectSnippet(
  editor: Editor,
  host: McpHost = "prod",
  apiKey?: string,
): string {
  const url = mcpUrl(host);
  const key = apiKey?.trim() || "<your-api-key>";
  switch (editor) {
    case "claude":
      return `claude mcp add compify-ui --transport http --url ${url} --header "Authorization: Bearer ${key}"`;
    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            "compify-ui": { url, headers: { Authorization: `Bearer ${key}` } },
          },
        },
        null,
        2
      );
    case "codex":
      return `export COMPIFY_UI_API_KEY=${key}\ncodex mcp add compify-ui --url ${url} --bearer-token-env-var COMPIFY_UI_API_KEY`;
  }
}

/** Builds the Framer paste payload: module URL when hosted, otherwise source + prop hints. */
export function framerCopy(
  entry: RegistryEntry,
  source: string,
  tweaks: TweakState
): string {
  const moduleUrl = entry.framerModuleUrl?.trim();
  if (moduleUrl) return moduleUrl;

  const changed = entry.tweakSchema
    .filter(
      (c) =>
        isTweakableControl(c) &&
        tweaks[c.key] !== undefined &&
        tweaks[c.key] !== c.default,
    )
    .map((c) => `//   ${c.key}: ${JSON.stringify(tweaks[c.key])}`);
  const header = [
    `// ${entry.displayName} — Compify UI`,
    `// Paste into a Framer code component (Insert → Code → New Component).`,
    changed.length
      ? `// In the Framer property panel, set:\n${changed.join("\n")}`
      : `// All defaults — adjust in the Framer property panel.`,
  ].join("\n");
  return `${header}\n\n${source}`;
}
