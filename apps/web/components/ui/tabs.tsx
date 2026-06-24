// shadcn Tabs + Framer Motion — sliding indicator + animated panels
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { microTransition, tabContentVariants } from "@/lib/motion";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...rest }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("relative flex w-full items-center", className)}
    {...rest}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

function SegmentedTabsTrigger({
  className,
  children,
  value,
  activeValue,
  layoutId = "tabs-indicator",
  ...rest
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  activeValue: string;
  layoutId?: string;
}) {
  const isActive = value === activeValue;

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "ui-press relative z-10 flex flex-1 items-center justify-center gap-[6px] px-1 py-[7px] text-[13px] ui-micro",
        "text-[#aaa] data-[state=active]:text-white",
        "focus-visible:outline-none",
        className,
      )}
      {...rest}
    >
      {isActive ? (
        <motion.span
          layoutId={layoutId}
          className="pointer-events-none absolute inset-0 border border-stroke bg-elevated"
          transition={microTransition}
        />
      ) : null}
      <span className="relative z-10 flex items-center justify-center gap-[6px]">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

/** Crossfade wrapper — renders the active panel with enter/exit motion. */
function AnimatedTabPanels<T extends string>({
  value,
  panels,
  className,
}: {
  value: T;
  panels: Record<T, React.ReactNode>;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={tabContentVariants}
        transition={microTransition}
      >
        {panels[value]}
      </motion.div>
    </AnimatePresence>
  );
}

export { Tabs, TabsList, SegmentedTabsTrigger, AnimatedTabPanels };
