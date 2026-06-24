"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { RegistryEntry } from "@compify/shared";
import { GalleryFilterProvider, useGalleryFilter } from "@/lib/gallery-filter-context";
import { AuthProvider } from "./AuthProvider";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { MobileGate } from "./MobileGate";
import * as Tooltip from "@/components/ui/tooltip";
import type { CategoryItem, ComponentItem } from "./Sidebar";
import { layoutTransition } from "@/lib/motion";
import { cn } from "@/lib/cn";

/** Routes that show the main sidebar. `/components/*` shows the detail sidebar. */
const MAIN_ROUTES = new Set(["/", "/intro", "/connect", "/framer"]);

type FrameData = {
  categories: CategoryItem[];
  components: ComponentItem[];
  registry: RegistryEntry[];
};

function Frame({
  categories,
  components,
  registry,
  children,
}: FrameData & { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { query, setQuery, category, setCategory } = useGalleryFilter();

  const isDetail = pathname.startsWith("/components/");
  const isMain = MAIN_ROUTES.has(pathname);

  // Admin, editor, preview, 404, etc. render without the shared sidebar shell.
  if (!isDetail && !isMain) {
    return <>{children}</>;
  }

  const isHome = pathname === "/";
  const activeSort = isHome ? searchParams.get("sort") : null;

  return (
    <div className="flex min-h-screen overflow-x-clip">
      <UnifiedSidebar
        categories={categories}
        components={components}
        registry={registry}
        query={query}
        onQuery={setQuery}
        activeCategory={category}
        onCategory={setCategory}
        activeSort={activeSort}
        interactive={isHome}
      />
      <div
        className={cn(
          "relative min-w-0 flex-1 overflow-x-clip",
          isDetail && "h-screen overflow-hidden",
        )}
      >
        <div className={cn(isDetail ? "h-full" : "min-h-full")}>
          <Suspense fallback={<div className="min-h-full" />}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * App-wide shell rendered once at the root so the sidebar persists across every
 * navigation — which is what lets it slide between the main and detail rails
 * instead of remounting. Providers live here so both the sidebar and the page
 * content share the same gallery-filter state.
 */
export function AppFrame(props: FrameData & { children: React.ReactNode }) {
  return (
    <MotionConfig transition={layoutTransition}>
      <AuthProvider>
        <GalleryFilterProvider>
          <Tooltip.Provider delayDuration={200}>
            {/* Desktop (lg+) — the full app: sidebar, library, detail, auth. */}
            <div className="hidden lg:contents">
              <Frame {...props} />
            </div>
            {/* Phones & tablets (< lg) — Introduction only, no library/auth. */}
            <div className="lg:hidden">
              <MobileGate />
            </div>
          </Tooltip.Provider>
        </GalleryFilterProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
