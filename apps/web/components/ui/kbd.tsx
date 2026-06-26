"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// Adapted from AlignUI Kbd (https://www.alignui.com/docs/v1.2/ui/kbd).
// AlignUI's light-theme tokens are mapped to Compify's dark tokens:
//   bg-bg-white-0       → bg-elevated   (#242424 keycap face)
//   text-text-soft-400  → text-muted
//   ring-stroke-soft-200→ ring-stroke   (#212121 inset hairline)
//   text-subheading-xs  → text-2xs      (11px)
export function Kbd({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-5 items-center gap-0.5 whitespace-nowrap rounded bg-elevated px-1.5 text-2xs text-muted ring-1 ring-inset ring-stroke",
        className,
      )}
      {...rest}
    />
  );
}

// The ⌘K / Ctrl K hint shown in the search trigger. Platform-aware: ⌘ on Apple
// hardware, Ctrl elsewhere. SSR + first client render both show ⌘ (so there is
// no hydration mismatch); the effect corrects it after mount.
export function SearchKbd({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    const ua = `${navigator.platform} ${navigator.userAgent}`;
    setIsMac(/mac|iphone|ipad|ipod/i.test(ua));
  }, []);
  return (
    <Kbd className={cn("shrink-0", className)} aria-hidden>
      {`${isMac ? "⌘" : "Ctrl"} + K`}
    </Kbd>
  );
}
