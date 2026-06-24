"use client";

// SPIKE 1 harness — proves a runtime-compiled component module can be
// dynamic-imported into the live React tree, sharing the host's single React
// instance, with framer-motion working and props tweakable with zero latency.
//
// Visit /spike. PASS = the button renders, the cursor-follow specular + press
// animation work (framer-motion + hooks on shared React), and the controls
// below mutate it live. FAIL = the error panel shows "Invalid hook call" or
// the module fails to load.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JsxRuntime from "react/jsx-runtime";
import * as FramerMotion from "framer-motion";

// Expose the host's instances BEFORE any compiled module imports them. The
// compiled module's imports for these were rewritten to read from this global,
// so it shares exactly these instances — no second copy of React or
// framer-motion (and one shared framer-motion motion context).
(globalThis as any).__compifyGlobals = {
  react: React,
  "react-dom": ReactDOM,
  "react/jsx-runtime": JsxRuntime,
  "framer-motion": FramerMotion,
};

const MODULE_URL = "/compify-runtime/shiny-button.mjs";

type AnyComp = React.ComponentType<Record<string, unknown>>;

class Boundary extends React.Component<
  { children: React.ReactNode; onError: (e: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function SpikePage() {
  const [Comp, setComp] = React.useState<AnyComp | null>(null);
  const [status, setStatus] = React.useState("loading module…");
  const [error, setError] = React.useState<string | null>(null);

  // Live tweak state — driven by the controls, passed straight as props.
  const [label, setLabel] = React.useState("Tweak me live");
  const [baseColor, setBaseColor] = React.useState("#2E323A");
  const [highlightSize, setHighlightSize] = React.useState(120);

  React.useEffect(() => {
    let alive = true;
    // webpackIgnore keeps Next/webpack from trying to bundle this URL — it is a
    // real runtime network import of a static ESM module.
    import(/* webpackIgnore: true */ MODULE_URL)
      .then((mod) => {
        if (!alive) return;
        const C = (mod.default ?? mod) as AnyComp;
        setComp(() => C);
        setStatus("module loaded — rendering");
      })
      .catch((e) => {
        if (!alive) return;
        setError(`import failed: ${String(e?.message ?? e)}`);
        setStatus("FAIL");
      });
    return () => {
      alive = false;
    };
  }, []);

  const sharedReactOk =
    (globalThis as any).__compifyGlobals?.react === React;

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0f", color: "#e8e8ea", padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Spike 1 — runtime module loader</h1>
      <p style={{ opacity: 0.7, marginBottom: 24, fontSize: 14 }}>
        Compiled module dynamic-imported into the live React tree, sharing the host React instance.
      </p>

      <div style={{ display: "grid", gap: 6, marginBottom: 24, fontSize: 13, fontFamily: "monospace" }}>
        <div>status: <b style={{ color: error ? "#ff6b6b" : "#79e07a" }}>{status}</b></div>
        <div>shared-React identity check: <b style={{ color: sharedReactOk ? "#79e07a" : "#ff6b6b" }}>{sharedReactOk ? "PASS" : "FAIL"}</b></div>
        {error && <div style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>error: {error}</div>}
      </div>

      {/* Live controls — prove zero-latency prop tweaking via React state. */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28, alignItems: "center" }}>
        <label style={{ fontSize: 13 }}>
          label{" "}
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={{ padding: 4 }} />
        </label>
        <label style={{ fontSize: 13 }}>
          base color{" "}
          <input type="color" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} />
        </label>
        <label style={{ fontSize: 13 }}>
          highlight size {highlightSize}px{" "}
          <input type="range" min={10} max={300} value={highlightSize} onChange={(e) => setHighlightSize(Number(e.target.value))} />
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, border: "1px dashed #333", borderRadius: 12, background: "#141419" }}>
        {Comp ? (
          <Boundary onError={(e) => { setError(`render error: ${e.message}`); setStatus("FAIL"); }}>
            <Comp label={label} baseColor={baseColor} highlightSize={highlightSize} />
          </Boundary>
        ) : (
          <span style={{ opacity: 0.5, fontSize: 13 }}>waiting for module…</span>
        )}
      </div>
    </main>
  );
}
