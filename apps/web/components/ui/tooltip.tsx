// AlignUI Tooltip — adapted for Compify tokens
// https://alignui.com/docs/v1.2/ui/tooltip

"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const contentSize = {
  xsmall: "rounded px-1.5 py-0.5 text-[11px] leading-normal",
  small: "rounded-md px-2.5 py-1 text-[12px] leading-normal",
  medium: "rounded-xl p-3 text-[13px] leading-normal",
} as const;

const contentVariant = {
  dark: "border border-stroke bg-[#292929] text-[#b8b8b8]",
  light: "bg-white text-black ring-1 ring-stroke",
} as const;

const arrowVariant = {
  dark: "border-stroke bg-[#292929]",
  light: "border-stroke bg-white",
} as const;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  size?: keyof typeof contentSize;
  variant?: keyof typeof contentVariant;
  showArrow?: boolean;
};

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    {
      size = "small",
      variant = "dark",
      showArrow = true,
      className,
      children,
      sideOffset = 4,
      ...rest
    },
    forwardedRef,
  ) => {
    const arrowSize = size === "xsmall" ? "size-1.5 rounded-bl-sm" : "size-2 rounded-bl-[3px]";

    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={forwardedRef}
          sideOffset={sideOffset}
          className={cn(
            "z-[2147483647] font-mono shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            contentSize[size],
            contentVariant[variant],
            className,
          )}
          {...rest}
        >
          {children}
          {showArrow ? (
            <TooltipPrimitive.Arrow asChild>
              <div
                className={cn(
                  arrowSize,
                  "-translate-y-1/2 -rotate-45 border [clip-path:polygon(0_100%,0_0,100%_100%)]",
                  arrowVariant[variant],
                )}
              />
            </TooltipPrimitive.Arrow>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
  TooltipProvider as Provider,
  TooltipRoot as Root,
  TooltipTrigger as Trigger,
  TooltipContent as Content,
};
