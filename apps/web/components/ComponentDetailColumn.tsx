"use client";

import { useEffect, useState } from "react";
import { RiEyeLine } from "@remixicon/react";
import type { RegistryEntry, TweakState } from "@compify/shared";
import { resolvePreviewLayout } from "@/lib/preview";
import { fetchStats, incrementView, type ComponentStats } from "@/lib/stats";
import { consumeViewIntent } from "@/lib/view-intent";
import { PreviewFrame } from "./PreviewFrame";
import { CopyDropdown } from "./CopyDropdown";
import { AdminEditButton } from "./AdminEditButton";
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

  // Count a view only when this component was deliberately chosen (a click that
  // set a view intent); a plain refresh or pasted URL just reads current totals
  // so the view count can't outpace copies. Live-bumps copies when one fires.
  useEffect(() => {
    let active = true;
    const chosen = consumeViewIntent(entry.name);
    void (chosen ? incrementView(entry.name) : fetchStats(entry.name)).then((next) => {
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
          <h1 className="text-xl font-medium leading-[28px] tracking-[-1.2px] text-white">
            {entry.displayName}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[6px]">
              <RiEyeLine size={14} className="text-[#b8b8b8]" />
              <span className="text-sm leading-5 tracking-[-0.14px] text-[#b8b8b8]">
                {views.toLocaleString()}
              </span>
            </div>
            <span className="size-1 bg-[#b8b8b8]" />
            <span className="text-sm leading-5 tracking-[-0.14px] text-[#b8b8b8]">
              Used by {usedBy.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminEditButton slug={entry.name} />
          <CopyDropdown entry={entry} source={source} state={state} />
        </div>
      </header>

      <PreviewFrame
        name={entry.name}
        state={state}
        previewAccent={entry.previewAccent}
        previewLayout={resolvePreviewLayout(entry)}
        moduleUrl={moduleUrl ?? entry.compiledModuleUrl}
        surfaceLayout={entry.previewSurfaces?.detail}
      />
      <ComponentDocumentation entry={entry} />
    </div>
  );
}
