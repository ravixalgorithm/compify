"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type OptimisticClick = {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
};

type Ctx = {
  path: string;
  navigate: (href: string, e?: OptimisticClick) => void;
};

const OptimisticPathContext = createContext<Ctx | null>(null);

/**
 * Tracks an *optimistic* pathname that flips the instant a sidebar/gallery link
 * is clicked — before the (often force-dynamic, server-rendered) destination
 * page commits. The sidebar drives its active highlight and its main↔detail
 * slide from this, so they react on click instead of waiting for the page.
 *
 * It reconciles back to the real pathname whenever a navigation actually lands
 * (which also covers browser back/forward and redirects), so the optimistic
 * value can never get permanently out of sync with the rendered route.
 */
export function OptimisticNavProvider({ children }: { children: React.ReactNode }) {
  const realPath = usePathname() || "/";
  const [path, setPath] = useState(realPath);

  // Reconcile once the real navigation lands (back/forward/redirect included).
  useEffect(() => {
    setPath(realPath);
  }, [realPath]);

  const navigate = useCallback<Ctx["navigate"]>((href, e) => {
    // Ignore modifier / non-primary clicks: those open a new tab and leave this
    // view where it is, so the optimistic pathname must not move.
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button ?? 0) !== 0)) {
      return;
    }
    setPath(href.split(/[?#]/)[0]);
  }, []);

  return (
    <OptimisticPathContext.Provider value={{ path, navigate }}>
      {children}
    </OptimisticPathContext.Provider>
  );
}

/**
 * The optimistic pathname when inside an OptimisticNavProvider, else the real
 * pathname — so components reading it work identically outside the provider
 * (e.g. the standalone Sidebar in AppShell).
 */
export function useOptimisticPath(): string {
  const real = usePathname() || "/";
  return useContext(OptimisticPathContext)?.path ?? real;
}

/** Flip the optimistic pathname on a link click. No-op outside the provider. */
export function useOptimisticNavigate(): Ctx["navigate"] {
  return useContext(OptimisticPathContext)?.navigate ?? (() => {});
}
