"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegistryEntry, TweakState, TweakValue } from "@compify/shared";
import { resolvePreviewState } from "@/lib/generateRegistryOutput";
import { useLiveControls } from "@/lib/runtime-module";
import { collectFontFamilies, ensureFontLoaded } from "@/lib/fonts";
import { TweakPanel } from "./TweakPanel";
import { ComponentDetailColumn } from "./ComponentDetailColumn";
import { GradientSupportProbe } from "./GradientSupportProbe";

export function ComponentWorkspace({
  entry,
  source,
  moduleUrl,
}: {
  entry: RegistryEntry;
  source: string;
  moduleUrl?: string;
}) {
  // The schema introspected live from the loaded module wins over the
  // server-stored one (it can't drift from the actual component); until it
  // loads we render from the DB schema so there's no flash of an empty panel.
  const liveSchema = useLiveControls(moduleUrl ?? entry.compiledModuleUrl);
  const schema = liveSchema ?? entry.tweakSchema;

  // The default state is the admin's saved preview (entry.previewDefaults) laid
  // over each control's own default — so the page opens looking how the admin
  // configured it, not the raw Framer defaults. Reset returns here too.
  const previewDefaults = entry.previewDefaults;
  const defaults = useMemo<TweakState>(
    () => resolvePreviewState(schema, previewDefaults),
    [schema, previewDefaults],
  );
  const [state, setState] = useState<TweakState>(defaults);

  // When the schema changes (e.g. the live one arrives), keep the user's
  // existing edits for controls that still exist, seed new controls from the
  // admin preview default (falling back to the control default), and drop
  // controls that no longer exist.
  useEffect(() => {
    setState((prev) => {
      const next: TweakState = {};
      for (const control of schema) {
        next[control.key] =
          control.key in prev
            ? prev[control.key]
            : previewDefaults && control.key in previewDefaults
              ? previewDefaults[control.key]
              : control.default;
      }
      return next;
    });
  }, [schema, previewDefaults]);

  // Preload every active font family so the preview renders in it even while its
  // control is in a collapsed (unmounted) panel section.
  useEffect(() => {
    for (const family of collectFontFamilies(schema, state)) ensureFontLoaded(family);
  }, [schema, state]);

  // Gradient support: a CSS gradient only shows where the component applies the
  // value to `background`. Probe the component once (hidden) to learn which
  // color props actually render a gradient, so the picker can hide the Gradient
  // tab everywhere it wouldn't take effect. Re-probes when the component changes.
  const probeModuleUrl = moduleUrl ?? entry.compiledModuleUrl;
  const colorKeys = useMemo(
    () => schema.filter((c) => c.type === "color").map((c) => c.key),
    [schema],
  );
  const colorKeySig = colorKeys.join(",");
  const [gradientKeys, setGradientKeys] = useState<Set<string> | null>(null);
  useEffect(() => {
    setGradientKeys(null);
  }, [probeModuleUrl, entry.name, colorKeySig]);

  return (
    <div className="flex h-full min-w-0">
      {/* Scrolling content column — framed like the gallery; scrolls independently
          of the control panel. */}
      <main className="no-scrollbar relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        <div className="min-h-full bg-bg p-[14px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)] xl:p-[26px]">
          {gradientKeys === null && colorKeys.length > 0 ? (
            <GradientSupportProbe
              name={entry.name}
              moduleUrl={probeModuleUrl}
              defaults={defaults}
              colorKeys={colorKeys}
              onResult={setGradientKeys}
            />
          ) : null}
          <ComponentDetailColumn entry={entry} source={source} state={state} moduleUrl={moduleUrl} />
        </div>
      </main>

      {/* Control panel — a full-height rail stuck to the right edge, like the
          sidebar. It owns its own internal scroll (TweakPanel is h-full). */}
      <aside className="h-full w-[300px] shrink-0 xl:w-[325px] 3xl:w-[500px]">
        <TweakPanel
          schema={schema}
          state={state}
          onChange={(key, value: TweakValue) =>
            setState((s) => ({ ...s, [key]: value }))
          }
          onReset={() => setState(defaults)}
          gradientKeys={gradientKeys}
        />
      </aside>
    </div>
  );
}
