"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { TweakState } from "@compify/shared";
import { loadRuntimeModule, moduleDefaults } from "@/lib/runtime-module";

// Loads a runtime-compiled component module (from Storage) and renders its
// default export. Modules are cached by URL (shared with useLiveControls), so
// prop tweaks re-render the already-loaded component with new props
// (zero-latency, real React) — they do NOT re-fetch. Relies on RuntimeGlobals
// having exposed the host deps. Errors are thrown during render so the
// surrounding PreviewErrorBoundary catches them.
//
// Props are rendered as `{ ...moduleDefaults, ...componentProps }`: the module's
// own control defaults backfill anything the caller didn't pass, so a component
// that reads a prop without an internal fallback (relying on Framer to inject the
// default) never receives `undefined` and crashes.

type Loaded = {
  Comp: ComponentType<Record<string, unknown>>;
  defaults: TweakState;
};

export function DynamicComponent({
  moduleUrl,
  componentProps,
}: {
  moduleUrl: string;
  componentProps: Record<string, unknown>;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setError(null);
    loadRuntimeModule(moduleUrl)
      .then((C) => alive && setLoaded({ Comp: C, defaults: moduleDefaults(C) }))
      .catch((e) => alive && setError(e instanceof Error ? e : new Error(String(e))));
    return () => {
      alive = false;
    };
  }, [moduleUrl]);

  if (error) throw error;
  if (!loaded) return null;
  const { Comp, defaults } = loaded;
  return <Comp {...defaults} {...componentProps} />;
}
