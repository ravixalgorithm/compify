"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegistryEntry, TweakState } from "@compify/shared";
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
  const defaults = useMemo<TweakState>(
    () => Object.fromEntries(entry.tweakSchema.map((c) => [c.key, c.default])),
    [entry]
  );
  const [state, setState] = useState<TweakState>(defaults);

  useEffect(() => {
    setState(defaults);
  }, [defaults]);

  return (
    <div className="flex flex-col gap-5 p-[26px] xl:flex-row xl:items-start">
      <ComponentDetailColumn entry={entry} source={source} state={state} moduleUrl={moduleUrl} />

      {/* Stacks below the preview up to xl (so 1024px tablets get a full-width preview);
          becomes the sticky side rail at xl+.
          top-8 (32px) = main p-1.5 (6px) + workspace pt — matches natural offset so sticky never jumps */}
      <aside className="h-[70vh] w-full shrink-0 overflow-hidden [contain:layout] xl:sticky xl:top-8 xl:z-10 xl:h-[calc(100vh-42px)] xl:w-[325px]">
        <TweakPanel
          schema={entry.tweakSchema}
          state={state}
          onChange={(key, value) => setState((s) => ({ ...s, [key]: value }))}
          onReset={() => setState(defaults)}
        />
      </aside>
    </div>
  );
}
