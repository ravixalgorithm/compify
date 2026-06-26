"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegistryEntry, TweakState, TweakValue } from "@compify/shared";
import { tweakDefaults } from "@/lib/generateRegistryOutput";
import { useLiveControls } from "@/lib/runtime-module";
import { collectFontFamilies, ensureFontLoaded } from "@/lib/fonts";
import { TweakPanel } from "./TweakPanel";
import { ComponentDetailColumn } from "./ComponentDetailColumn";

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

  const defaults = useMemo<TweakState>(() => tweakDefaults(schema), [schema]);
  const [state, setState] = useState<TweakState>(defaults);

  // When the schema changes (e.g. the live one arrives), keep the user's
  // existing edits for controls that still exist, seed new controls with their
  // default, and drop controls that no longer exist.
  useEffect(() => {
    setState((prev) => {
      const next: TweakState = {};
      for (const control of schema) {
        next[control.key] =
          control.key in prev ? prev[control.key] : control.default;
      }
      return next;
    });
  }, [schema]);

  // Preload every active font family so the preview renders in it even while its
  // control is in a collapsed (unmounted) panel section.
  useEffect(() => {
    for (const family of collectFontFamilies(schema, state)) ensureFontLoaded(family);
  }, [schema, state]);

  return (
    <div className="flex flex-col gap-5 p-[14px] xl:flex-row xl:items-start xl:p-[26px] 3xl:mx-auto 3xl:max-w-[1560px]">
      <ComponentDetailColumn entry={entry} source={source} state={state} moduleUrl={moduleUrl} />

      {/* Stacks below the preview up to xl (so 1024px tablets get a full-width preview);
          becomes the sticky side rail at xl+. On large monitors (3xl) the whole row is
          clamped + centered so the preview/docs stay fixed-width and the panel grows.
          top-8 (32px) = main p-1.5 (6px) + workspace pt — matches natural offset so sticky never jumps */}
      <aside className="h-[70vh] w-full shrink-0 overflow-hidden [contain:layout] xl:sticky xl:top-8 xl:z-10 xl:h-[calc(100vh-42px)] xl:w-[325px] 3xl:w-[500px]">
        <TweakPanel
          schema={schema}
          state={state}
          onChange={(key, value: TweakValue) =>
            setState((s) => ({ ...s, [key]: value }))
          }
          onReset={() => setState(defaults)}
        />
      </aside>
    </div>
  );
}
