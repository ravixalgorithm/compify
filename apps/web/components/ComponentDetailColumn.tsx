"use client";

import { useEffect, useState } from "react";
import { RiEyeLine } from "@remixicon/react";
import type { RegistryEntry, TweakState } from "@compify/shared";
import { resolvePreviewLayout } from "@/lib/preview";
import { incrementView, type ComponentStats } from "@/lib/stats";
import { PreviewFrame } from "./PreviewFrame";
import { CopyDropdown } from "./CopyDropdown";
import { ComponentDocumentation } from "./ComponentDocumentation";

/** Figma 154:869 — left column: header, preview, documentation. */
export function ComponentDetailColumn({
  entry,
  source,
  state,
  moduleUrl,
}: {
  entry: RegistryEntry;
  source: string;
  state: TweakState;
  moduleUrl?: string;
}) {
  const [stats, setStats] = useState<ComponentStats | null>(null);

  // +1 view on every page load/refresh; live-bump uses when a copy fires.
  useEffect(() => {
    let active = true;
    void incrementView(entry.name).then((next) => {
      if (active && next) setStats(next);
    });

    function onCopy(e: Event) {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === entry.name) {
        setStats((prev) => (prev ? { ...prev, copies: prev.copies + 1 } : prev));
      }
    }
    window.addEventListener("compify:copy", onCopy);
    return () => {
      active = false;
      window.removeEventListener("compify:copy", onCopy);
    };
  }, [entry.name]);

  const views = stats?.views ?? 0;
  const usedBy = stats?.copies ?? 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
      {/* Figma 154:870 — title, view stats, copy split button */}
      <header className="flex h-[54px] shrink-0 items-center justify-between pr-[2px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[20px] font-medium leading-[28px] tracking-[-1.2px] text-white">
            {entry.displayName}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[6px]">
              <RiEyeLine size={14} className="text-[#999]" />
              <span className="text-[14px] leading-5 tracking-[-0.14px] text-[#999]">
                {views.toLocaleString()}
              </span>
            </div>
            <span className="size-1 bg-[#999]" />
            <span className="text-[14px] leading-5 tracking-[-0.14px] text-[#999]">
              Used by {usedBy.toLocaleString()}
            </span>
          </div>
        </div>
        <CopyDropdown entry={entry} source={source} state={state} />
      </header>

      <PreviewFrame
        name={entry.name}
        state={state}
        previewAccent={entry.previewAccent}
        previewLayout={resolvePreviewLayout(entry)}
        moduleUrl={moduleUrl ?? entry.compiledModuleUrl}
      />
      <ComponentDocumentation entry={entry} />
    </div>
  );
}
