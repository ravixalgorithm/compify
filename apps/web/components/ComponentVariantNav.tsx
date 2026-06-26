"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import {
  RiArrowLeftSLine,
  RiLayoutGridLine,
  RiListUnordered,
} from "@remixicon/react";
import { CATEGORIES, type RegistryEntry } from "@compify/shared";
import { ViewIntentLink } from "./ViewIntentLink";
import { SectionDivider } from "./SectionDivider";
import { DetailVariantPreview } from "./DetailVariantPreview";
import { sortComponentsAlphabetically } from "./Sidebar";
import {
  SegmentedTabsTrigger,
  Tabs,
  TabsList,
} from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { microTransition, sidebarSlideTransition } from "@/lib/motion";
import { ActiveBg, ActiveDot } from "./ActiveHighlight";

type ViewMode = "list" | "grid";

/** Run layout effects on the client, fall back to useEffect during SSR. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function VariantListRow({
  variant,
  active,
}: {
  variant: RegistryEntry;
  active: boolean;
}) {
  return (
    <ViewIntentLink
      slug={variant.name}
      href={`/components/${variant.name}`}
      prefetch
      className={cn(
        "relative flex w-full items-center justify-between px-[12px] py-[9px]",
        !active && "hover:bg-elevated/40",
      )}
    >
      <ActiveBg active={active} />
      <motion.span
        className="relative z-10 truncate text-sm tracking-[-0.42px] 3xl:text-base"
        initial={false}
        animate={{
          color: active ? "#ffffff" : "#b8b8b8",
          fontWeight: active ? 500 : 400,
        }}
        transition={microTransition}
      >
        {variant.displayName}
      </motion.span>
      <span className="relative z-10 flex size-[4px] shrink-0 items-center justify-center">
        <ActiveDot active={active} />
      </span>
    </ViewIntentLink>
  );
}

function VariantGridCard({
  variant,
  active,
}: {
  variant: RegistryEntry;
  active: boolean;
}) {
  return (
    // Link is an absolute overlay (not a wrapper) so the live variant preview is
    // never rendered inside an <a> (a component can render its own anchor, and
    // <a> inside <a> is invalid HTML / a hydration error).
    <div
      className={cn(
        "ui-micro relative flex w-full flex-col gap-[6px] p-[6px]",
        !active && "hover:bg-[#171717]/50",
      )}
    >
      {active ? (
        <ActiveBg
          active
          className="pointer-events-none absolute inset-0 border border-[#242424] bg-[#171717]"
        />
      ) : null}
      <div className="relative z-10 h-[152px] w-full shrink-0 overflow-hidden bg-black">
        <DetailVariantPreview entry={variant} />
      </div>
      <motion.span
        className="relative z-10 text-sm font-medium tracking-[-0.42px] 3xl:text-base"
        initial={false}
        animate={{ color: active ? "#ffffff" : "#b8b8b8" }}
        transition={microTransition}
      >
        {variant.displayName}
      </motion.span>
      <ViewIntentLink
        slug={variant.name}
        href={`/components/${variant.name}`}
        prefetch
        aria-label={`View ${variant.displayName}`}
        className="absolute inset-0 z-20"
      />
    </div>
  );
}

/** Back to gallery + list/grid variant switcher for component detail pages. */
export function ComponentVariantNav({
  entry,
  variants,
}: {
  entry: RegistryEntry;
  variants: RegistryEntry[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const categoryLabel =
    CATEGORIES.find((c) => c.id === entry.category)?.label ?? entry.category;

  const sortedVariants = useMemo(
    () => sortComponentsAlphabetically(variants),
    [variants],
  );

  // Track the active panel's height so the sliding container collapses to it
  // (the grid panel is taller than the list, which would otherwise leave a gap).
  const listRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [trackHeight, setTrackHeight] = useState<number>();

  useIsomorphicLayoutEffect(() => {
    const active = viewMode === "list" ? listRef.current : gridRef.current;
    if (active) setTrackHeight(active.offsetHeight);
  }, [viewMode, sortedVariants]);

  if (sortedVariants.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col gap-[8px]">
        <Link
          href="/"
          className="ui-micro flex w-full items-center gap-[8px] px-[12px] py-[9px] hover:bg-elevated/40"
        >
          <RiArrowLeftSLine size={16} className="shrink-0 text-white" />
          <span className="text-sm font-medium uppercase tracking-[-0.42px] text-white 3xl:text-base">
            {categoryLabel}
          </span>
        </Link>
        <SectionDivider />
      </div>

      <Tabs value={viewMode} onValueChange={(next) => setViewMode(next as ViewMode)}>
        <TabsList>
          <SegmentedTabsTrigger
            value="list"
            activeValue={viewMode}
            layoutId="detail-view-toggle"
          >
            <RiListUnordered size={18} />
            <span>List</span>
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger
            value="grid"
            activeValue={viewMode}
            layoutId="detail-view-toggle"
          >
            <RiLayoutGridLine size={18} />
            <span>Grid</span>
          </SegmentedTabsTrigger>
        </TabsList>
      </Tabs>

      {/* Same horizontal slide as the main sidebar swap: a 200%-wide track with
          both panels side by side, translating between them (no crossfade). */}
      <motion.div
        className="relative w-full overflow-hidden"
        initial={false}
        animate={{ height: trackHeight }}
        transition={sidebarSlideTransition}
      >
        <motion.div
          className="flex w-[200%] items-start"
          initial={false}
          animate={{ x: viewMode === "grid" ? "-50%" : "0%" }}
          transition={sidebarSlideTransition}
        >
          <div ref={listRef} className="w-1/2 shrink-0">
            <div className="flex w-full flex-col gap-[14px]">
              <div className="flex items-center pl-[14px]">
                <p className="text-xs uppercase tracking-[-0.24px] text-white 3xl:text-sm">Variants</p>
              </div>
              <div className="flex w-full flex-col gap-[2px]">
                <LayoutGroup id="variant-list">
                  {sortedVariants.map((variant) => (
                    <VariantListRow
                      key={variant.name}
                      variant={variant}
                      active={variant.name === entry.name}
                    />
                  ))}
                </LayoutGroup>
              </div>
            </div>
          </div>
          <div ref={gridRef} className="w-1/2 shrink-0">
            <div className="flex w-full flex-col gap-[6px]">
              {sortedVariants.map((variant) => (
                <VariantGridCard
                  key={variant.name}
                  variant={variant}
                  active={variant.name === entry.name}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
