"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

// Loads a runtime-compiled component module (from Storage) and renders its
// default export. Modules are cached by URL, so prop tweaks re-render the
// already-loaded component with new props (zero-latency, real React) — they do
// NOT re-fetch. Relies on RuntimeGlobals having exposed the host deps. Errors
// are thrown during render so the surrounding PreviewErrorBoundary catches them.

const cache = new Map<string, Promise<ComponentType<Record<string, unknown>>>>();

function loadModule(url: string): Promise<ComponentType<Record<string, unknown>>> {
  let p = cache.get(url);
  if (!p) {
    // webpackIgnore: this is a real runtime network import of a static ESM
    // module URL, not something webpack should try to bundle.
    p = import(/* webpackIgnore: true */ url).then(
      (m) => (m.default ?? m) as ComponentType<Record<string, unknown>>,
    );
    cache.set(url, p);
  }
  return p;
}

export function DynamicComponent({
  moduleUrl,
  componentProps,
}: {
  moduleUrl: string;
  componentProps: Record<string, unknown>;
}) {
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setComp(null);
    setError(null);
    loadModule(moduleUrl)
      .then((C) => alive && setComp(() => C))
      .catch((e) => alive && setError(e instanceof Error ? e : new Error(String(e))));
    return () => {
      alive = false;
    };
  }, [moduleUrl]);

  if (error) throw error;
  if (!Comp) return null;
  return <Comp {...componentProps} />;
}
