import type { StackName, StylingName, TweakState } from "@compify/shared/types";

const FRAMER_IMPORT_RE =
  /^\s*import\s*\{[^}]*\}\s*from\s*["']framer["'];?\s*$/m;

/** Strips the trailing `addPropertyControls(...)` call block from source. */
function stripPropertyControls(src: string): string {
  const idx = src.indexOf("\naddPropertyControls(");
  if (idx === -1) return src;
  return src.slice(0, idx).trimEnd() + "\n";
}

/** Removes the bare `import ... from "framer"` line. */
function stripFramerImport(src: string): string {
  return src.replace(FRAMER_IMPORT_RE, "").replace(/\n{3,}/g, "\n\n");
}

export interface TransformOptions {
  stack?: StackName;
  styling?: StylingName;
  typescript?: boolean;
  tweaks?: TweakState;
}

/**
 * Serves a stack-aware variant of a Framer component's source.
 *
 * - framer  → source as-authored (property controls intact).
 * - react   → Framer bindings removed, plain React component.
 * - nextjs  → react variant + "use client" directive.
 * - vite    → same as react.
 *
 * When `tweaks` are provided, a header comment documents the exact prop
 * values the website preview was showing, so the delivered component matches.
 */
export function transformComponent(
  source: string,
  opts: TransformOptions
): string {
  const stack: StackName = opts.stack ?? "framer";
  let out = source;

  if (stack !== "framer") {
    out = stripPropertyControls(out);
    out = stripFramerImport(out);
  }
  if (stack === "nextjs") {
    out = `"use client";\n\n${out.trimStart()}`;
  }

  const header = buildHeader(opts, stack);
  return header ? `${header}\n${out}` : out;
}

function buildHeader(opts: TransformOptions, stack: StackName): string {
  const lines: string[] = [];
  lines.push(`// Delivered by Compify UI · stack: ${stack}` + (opts.styling ? ` · styling: ${opts.styling}` : ""));
  if (opts.tweaks && Object.keys(opts.tweaks).length > 0) {
    // One prop per line so object-valued controls (font, transition, image,
    // arrays) stay readable instead of collapsing onto a single huge comment.
    lines.push(`// Recommended props to match your tweak panel:`);
    for (const [k, v] of Object.entries(opts.tweaks)) {
      lines.push(`//   ${k}={${JSON.stringify(v)}}`);
    }
  }
  if (stack === "framer") {
    lines.push(`// Paste into a Framer code component. Property controls included.`);
  }
  return lines.join("\n");
}
