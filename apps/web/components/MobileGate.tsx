"use client";

import { Logo } from "./Logo";
import { Introduction } from "./Introduction";
import { toastError } from "./ui/sonner";

/**
 * Shown below lg (1024px) instead of the full app. On phones/tablets we only
 * surface the Introduction — no sidebar, library, or auth. "Browse Library"
 * raises a desktop-required toast since the library needs a larger screen.
 */
export function MobileGate() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center border-b border-stroke bg-bg">
        <Logo />
      </header>
      <div className="flex-1">
        <Introduction
          onBrowseLibrary={() =>
            toastError("Desktop Required", "Switch to desktop to view components")
          }
        />
      </div>
    </div>
  );
}
