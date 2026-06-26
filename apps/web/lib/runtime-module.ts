"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { extractPropertyControls } from "@compify/shared";
import type { TweakControl, TweakState } from "@compify/shared";

// Shared loader for runtime-compiled component modules (from Storage). One cache
// keyed by URL is reused by both the preview (DynamicComponent) and the live
// control reader (useLiveControls), so a component is fetched + evaluated once.
// The framer shim attaches `propertyControls` to the component during module
// evaluation, so the loaded component carries its full, real control schema.

type RuntimeComponent = ComponentType<Record<string, unknown>> & {
  propertyControls?: unknown;
};

const cache = new Map<string, Promise<RuntimeComponent>>();

export function loadRuntimeModule(url: string): Promise<RuntimeComponent> {
  let p = cache.get(url);
  if (!p) {
    // webpackIgnore: a real runtime network import of a static ESM module URL.
    p = import(/* webpackIgnore: true */ url).then(
      (m) => (m.default ?? m) as RuntimeComponent,
    );
    cache.set(url, p);
  }
  return p;
}

/**
 * Default props for a loaded module, derived from its own `propertyControls`.
 * Used to backfill props at render so the component never receives `undefined`
 * for a prop it declares a control (and default) for — Framer always injects
 * those defaults; outside Framer we must. Covers every ControlType.
 */
export function moduleDefaults(component: RuntimeComponent): TweakState {
  const out: TweakState = {};
  for (const control of extractPropertyControls(component.propertyControls)) {
    out[control.key] = control.default;
  }
  return out;
}

/**
 * Load a compiled module and read its live `propertyControls`, normalized into
 * the tweak-panel schema. Returns null until loaded (and on failure) so callers
 * fall back to the server-stored schema. This guarantees the panel matches the
 * actual component even if the DB schema drifted.
 */
export function useLiveControls(moduleUrl?: string): TweakControl[] | null {
  const [schema, setSchema] = useState<TweakControl[] | null>(null);

  useEffect(() => {
    if (!moduleUrl) {
      setSchema(null);
      return;
    }
    let alive = true;
    loadRuntimeModule(moduleUrl)
      .then((C) => {
        if (!alive) return;
        // keepPredicates: retain Framer's `hidden` fns so the panel can do
        // conditional visibility (a control showing only when a sibling is set).
        const next = extractPropertyControls(C.propertyControls, { keepPredicates: true });
        setSchema(next.length ? next : null);
      })
      .catch(() => alive && setSchema(null));
    return () => {
      alive = false;
    };
  }, [moduleUrl]);

  return schema;
}
