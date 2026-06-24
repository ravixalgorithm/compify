// SPIKE 1 — compile a library component to a self-contained runtime ESM module.
//
// Goal: prove a component can be compiled to a standalone module that, when
// dynamically imported at runtime, shares the HOST's single React instance
// (so hooks + framer-motion work, no "invalid hook call"), with all other deps
// bundled in. React/react-dom/jsx-runtime are resolved to globals the host sets
// on globalThis.__compifyGlobals, so the emitted module has ZERO bare imports
// and needs no import map (which sidesteps Next's import-map ordering problem).
//
// Usage: node scripts/spike-compile.mjs [slug]   (default: shiny-button)

import esbuild from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const slug = process.argv[2] || "shiny-button";

// Resolve react/etc. from the web app's node_modules (not the repo root).
const webRequire = createRequire(resolve(root, "apps/web/package.json"));

// Enumerate the REAL export names of the host modules so the generated global
// shim matches whatever React version the app ships. esbuild validates named
// imports against these at bundle time — a missing name fails loudly, never
// silently.
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
async function keysOf(spec) {
  const mod = await import(pathToFileURL(webRequire.resolve(spec)).href);
  return Object.keys(mod).filter((k) => k !== "default" && IDENT.test(k));
}

// Modules the host app ALREADY ships — share its single instance via a global
// instead of bundling a copy into every component module. Keeps modules tiny
// and guarantees one framer-motion instance (its motion context needs that).
const GLOBAL_MODULES = {
  react: await keysOf("react"),
  "react-dom": await keysOf("react-dom"),
  "react/jsx-runtime": await keysOf("react/jsx-runtime"),
  "framer-motion": await keysOf("framer-motion"),
};

const globalShimPlugin = {
  name: "compify-global-shim",
  setup(build) {
    const filter = /^(react|react-dom|react\/jsx-runtime|framer-motion)$/;
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      namespace: "compify-global",
    }));
    build.onLoad({ filter: /.*/, namespace: "compify-global" }, (args) => {
      const names = GLOBAL_MODULES[args.path] ?? [];
      const contents = [
        `const __m = globalThis.__compifyGlobals && globalThis.__compifyGlobals[${JSON.stringify(args.path)}];`,
        `if (!__m) throw new Error("compify: host global not set for ${args.path}");`,
        `export default (__m.default !== undefined ? __m.default : __m);`,
        ...names.map((n) => `export const ${n} = __m[${JSON.stringify(n)}];`),
      ].join("\n");
      return { contents, loader: "js" };
    });
    // Bundle the existing no-op `framer` shim (addPropertyControls etc.).
    build.onResolve({ filter: /^framer$/ }, () => ({
      path: resolve(root, "packages/library/src/framer-shim.ts"),
    }));
  },
};

const entry = resolve(root, `packages/library/src/components/${slug}.tsx`);
const outfile = resolve(root, `apps/web/public/compify-runtime/${slug}.mjs`);

const result = await esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  minify: false,
  sourcemap: false,
  plugins: [globalShimPlugin],
  loader: { ".tsx": "tsx", ".ts": "ts" },
  metafile: true,
  logLevel: "info",
});

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
console.log(`\n[spike] compiled ${slug} -> public/compify-runtime/${slug}.mjs (${(bytes / 1024).toFixed(1)} KB)`);

// Guardrail: assert no second React got bundled in (the #1 landmine). The
// metafile lists every real file input; react/react-dom/scheduler must NOT be
// among them (they resolve to the host-global shim, not a node_modules file).
const leaked = Object.keys(result.metafile.inputs).filter((p) =>
  /node_modules\/(react|react-dom|scheduler)\//.test(p.replace(/\\/g, "/")),
);
console.log(
  `[spike] bundled-React leak check: ${leaked.length ? "FAIL -> " + leaked.join(", ") : "PASS (React stays external)"}`,
);
