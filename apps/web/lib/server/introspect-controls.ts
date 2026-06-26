// Server-only: evaluate a compiled component module in Node and read the live
// `propertyControls` object our `framer` shim attaches to the component during
// module evaluation. This recovers REAL default values the regex source parser
// can't see — resolved consts (e.g. `defaultValue: DEFAULT_IMAGES`), font and
// transition objects, and the full nested Array/Object schema — for every
// Framer ControlType.
//
// The compiled module reads react/react-dom/jsx-runtime/framer-motion from
// `globalThis.__compifyGlobals` (set here from the host's single instances) and
// has zero bare imports, so it evaluates via a `data:` URL with nothing to
// resolve. Only the module's top level runs (component definition +
// addPropertyControls) — the component body never renders, so this is cheap and
// SSR-safe. Any failure returns null so the caller falls back to the regex
// parser.
//
// Node runtime only (uses data: URL dynamic import). Routes must set
// `export const runtime = "nodejs"`.

import * as HostReact from "react";
import * as HostReactDOM from "react-dom";
import * as HostJsxRuntime from "react/jsx-runtime";
import * as HostFramerMotion from "framer-motion";
import { extractPropertyControls } from "@compify/shared";
import type { TweakControl } from "@compify/shared/types";

function ensureGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  if (!g.__compifyGlobals) {
    g.__compifyGlobals = {
      react: HostReact,
      "react-dom": HostReactDOM,
      "react/jsx-runtime": HostJsxRuntime,
      "framer-motion": HostFramerMotion,
    };
  }
}

const INTROSPECT_TIMEOUT_MS = 5000;

/**
 * Evaluate compiled ESM `code` and normalize its component's `propertyControls`
 * into the tweak-panel schema. Returns null on any failure (eval error, no
 * controls, timeout) so the caller can fall back to regex parsing.
 */
export async function introspectControls(code: string): Promise<TweakControl[] | null> {
  ensureGlobals();
  const url = `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  try {
    const mod = (await Promise.race([
      import(/* webpackIgnore: true */ url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("introspect timeout")), INTROSPECT_TIMEOUT_MS),
      ),
    ])) as Record<string, unknown>;

    const component = (mod?.default ?? mod) as { propertyControls?: unknown } | undefined;
    const raw = component?.propertyControls;
    if (!raw) return null;
    const schema = extractPropertyControls(raw);
    return schema.length ? schema : null;
  } catch {
    return null;
  }
}
