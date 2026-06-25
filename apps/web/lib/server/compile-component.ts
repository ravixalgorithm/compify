// Server-only: compile a component's raw .tsx `source` (from the DB) into a
// self-contained ESM module the website can dynamic-import at runtime.
//
// Proven in Spike 1. The emitted module reads react/react-dom/jsx-runtime and
// framer-motion from `globalThis.__compifyGlobals` (the host's single
// instances), so hooks + framer-motion work in the live React tree, the module
// stays tiny, and there are zero bare imports to resolve (no import map). The
// `framer` specifier resolves to an inlined no-op shim so the same source that
// runs in Framer also renders here without depending on library source files.
//
// NOTE: runs in the Node runtime only (esbuild has a native binary). API routes
// using this must set `export const runtime = "nodejs"`.

import esbuild from "esbuild";
import { createHash } from "node:crypto";
// Imported statically (not via runtime import()) so the export names are read
// from the bundle — a webpackIgnore'd dynamic import isn't resolvable in the
// Vercel serverless function and 500s the admin compile routes in production.
import * as HostReact from "react";
import * as HostReactDOM from "react-dom";
import * as HostJsxRuntime from "react/jsx-runtime";
import * as HostFramerMotion from "framer-motion";

export type CompileResult =
  | { ok: true; code: string; bytes: number; hash: string; warnings: string[] }
  | { ok: false; error: string; warnings: string[] };

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Inlined stand-in for Framer's built-in `framer` module (no-op outside Framer).
const FRAMER_SHIM = `
export const ControlType = new Proxy({}, { get: (_t, p) => String(p).toLowerCase() });
export function addPropertyControls(component, controls) {
  if (typeof component === "function") { try { component.propertyControls = controls; } catch {} }
}
export const RenderTarget = {
  current: () => "preview", canvas: "canvas", export: "export", preview: "preview", thumbnail: "thumbnail",
};
export function useIsStaticRenderer() { return false; }
`;

// Well-known named exports of the CJS host modules. The webpack server bundle
// doesn't reliably enumerate these via Object.keys on a `import * as` namespace
// (or its `.default`), so we hardcode the stable public API and union it with
// whatever IS enumerable at runtime — guaranteeing hooks like useState/useEffect
// are present in the generated shim. framer-motion is ESM and enumerates fine.
const KNOWN_EXPORTS: Record<string, string[]> = {
  react: [
    "Children", "Component", "Fragment", "Profiler", "PureComponent", "StrictMode",
    "Suspense", "cloneElement", "createContext", "createElement", "createFactory",
    "createRef", "forwardRef", "isValidElement", "lazy", "memo", "startTransition",
    "useCallback", "useContext", "useDebugValue", "useDeferredValue", "useEffect",
    "useId", "useImperativeHandle", "useInsertionEffect", "useLayoutEffect",
    "useMemo", "useReducer", "useRef", "useState", "useSyncExternalStore",
    "useTransition", "version",
  ],
  "react/jsx-runtime": ["Fragment", "jsx", "jsxs", "jsxDEV"],
  "react-dom": [
    "createPortal", "flushSync", "findDOMNode", "hydrate", "render",
    "unmountComponentAtNode", "unstable_batchedUpdates", "version",
  ],
};

let sharedExportsCache: Record<string, string[]> | null = null;
function sharedExports(): Record<string, string[]> {
  if (sharedExportsCache) return sharedExportsCache;
  const names = (m: any, spec: string): string[] => {
    const keys = new Set<string>(KNOWN_EXPORTS[spec] ?? []);
    for (const k of Object.keys(m ?? {})) keys.add(k);
    if (m?.default && typeof m.default === "object") {
      for (const k of Object.keys(m.default)) keys.add(k);
    }
    return [...keys].filter((k) => k !== "default" && IDENT.test(k));
  };
  sharedExportsCache = {
    "react": names(HostReact, "react"),
    "react-dom": names(HostReactDOM, "react-dom"),
    "react/jsx-runtime": names(HostJsxRuntime, "react/jsx-runtime"),
    "framer-motion": names(HostFramerMotion, "framer-motion"),
  };
  return sharedExportsCache;
}

function makeGlobalShim(spec: string, names: string[]): string {
  // Read each name from the host global, falling back to its `.default` — the
  // host may expose exports on the namespace (ESM, e.g. framer-motion) or on
  // `.default` (CJS interop, e.g. react), depending on the build.
  const get = (n: string) => {
    const k = JSON.stringify(n);
    return `(__m[${k}] !== undefined ? __m[${k}] : (__m.default && __m.default[${k}]))`;
  };
  return [
    `const __m = globalThis.__compifyGlobals && globalThis.__compifyGlobals[${JSON.stringify(spec)}];`,
    `if (!__m) throw new Error("compify: host global not set for ${spec}");`,
    `export default (__m.default !== undefined ? __m.default : __m);`,
    ...names.map((n) => `export const ${n} = ${get(n)};`),
  ].join("\n");
}

export async function compileComponent(input: { source: string; slug: string }): Promise<CompileResult> {
  const exportsMap = sharedExports();
  const sharedFilter = /^(react|react-dom|react\/jsx-runtime|framer-motion)$/;

  const plugin: esbuild.Plugin = {
    name: "compify-runtime",
    setup(build) {
      // Shared host deps -> read from globalThis (no second copy bundled).
      build.onResolve({ filter: sharedFilter }, (args) => ({ path: args.path, namespace: "compify-global" }));
      build.onLoad({ filter: /.*/, namespace: "compify-global" }, (args) => ({
        contents: makeGlobalShim(args.path, exportsMap[args.path] ?? []),
        loader: "js",
      }));
      // Bare `framer` -> inlined no-op shim (bundled in).
      build.onResolve({ filter: /^framer$/ }, () => ({ path: "framer", namespace: "compify-framer" }));
      build.onLoad({ filter: /.*/, namespace: "compify-framer" }, () => ({ contents: FRAMER_SHIM, loader: "js" }));
    },
  };

  let result: esbuild.BuildResult;
  try {
    result = await esbuild.build({
      stdin: { contents: input.source, sourcefile: `${input.slug}.tsx`, loader: "tsx", resolveDir: process.cwd() },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2020",
      jsx: "automatic",
      minify: true,
      write: false,
      metafile: true,
      logLevel: "silent",
      plugins: [plugin],
    });
  } catch (err) {
    // esbuild aggregates compile errors here — surface the human-readable text.
    const e = err as { errors?: esbuild.Message[]; message?: string };
    const formatted = e.errors?.length
      ? (await esbuild.formatMessages(e.errors, { kind: "error", color: false })).join("\n")
      : (e.message ?? "Unknown compile error");
    return { ok: false, error: formatted.trim(), warnings: [] };
  }

  const warnings = result.warnings?.length
    ? await esbuild.formatMessages(result.warnings, { kind: "warning", color: false })
    : [];

  // Guardrail: no second React/react-dom/scheduler may be bundled (the #1
  // landmine). The metafile lists every real file input; shared deps resolve to
  // the global shim (no node_modules file), so any such input is a real leak.
  const leaked = Object.keys(result.metafile?.inputs ?? {}).filter((p) =>
    /node_modules\/(react|react-dom|scheduler)\//.test(p.replace(/\\/g, "/")),
  );
  if (leaked.length) {
    return { ok: false, error: `Bundled a second copy of: ${leaked.join(", ")}. React must stay shared.`, warnings };
  }

  const code = result.outputFiles?.[0]?.text ?? "";
  if (!code) return { ok: false, error: "Compile produced no output.", warnings };

  const hash = createHash("sha256").update(code).digest("hex").slice(0, 16);
  return { ok: true, code, bytes: Buffer.byteLength(code, "utf8"), hash, warnings };
}
