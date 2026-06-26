"use client";

import type { RegistryEntry } from "@compify/shared";
import { Logo } from "./Logo";
import { Introduction } from "./Introduction";
import { toastError } from "./ui/sonner";

/**
 * Shown below lg (1024px) instead of the full app. On phones/tablets we only
 * surface the Introduction — no sidebar, library, or auth. "Browse Library"
 * raises a desktop-required toast since the library needs a larger screen.
 */
export function MobileGate({ entries = [] }: { entries?: RegistryEntry[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-stroke bg-bg px-2 shadow-[0_1px_0_rgba(0,0,0,0.4)]">
        <Logo />
      </header>
      <div className="flex-1">
        <Introduction
          entries={entries}
          onBrowseLibrary={() =>
            toastError("Desktop Required", "Switch to desktop to view components")
          }
        />
      </div>
    </div>
  );
}
