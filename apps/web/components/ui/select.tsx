// AlignUI Select — adapted for Compify tweak panel
// https://alignui.com/docs/v1.2/ui/select

"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { RiExpandUpDownLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

const SelectRoot = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...rest }, forwardedRef) => (
  <SelectPrimitive.Trigger
    ref={forwardedRef}
    className={cn(
      "group/trigger flex w-full min-w-0 items-center justify-between gap-1",
      "border border-black bg-black py-[4px] pl-2 pr-1",
      "font-mono text-[13px] capitalize text-[#aaa] outline-none",
      "duration-micro ease-micro transition-[color,background-color,border-color,box-shadow]",
      "data-[state=open]:text-white",
      className,
    )}
    {...rest}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <RiExpandUpDownLine
        size={16}
        className="shrink-0 text-[#aaa] duration-micro ease-micro transition-transform group-data-[state=open]/trigger:rotate-180"
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
  (
    { className, children, position = "popper", sideOffset = 4, collisionPadding = 8, ...rest },
    forwardedRef,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={forwardedRef}
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-[100] overflow-hidden border border-stroke bg-black shadow-[0px_4px_10px_rgba(0,0,0,0.4)]",
          "min-w-[var(--radix-select-trigger-width)]",
          "duration-300 ease-micro",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...rest}
      >
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...rest }, forwardedRef) => (
  <SelectPrimitive.Item
    ref={forwardedRef}
    className={cn(
      "relative cursor-pointer px-2 py-[6px] font-mono text-[13px] capitalize text-[#aaa] outline-none",
      "duration-micro ease-micro transition-[color,background-color]",
      "data-[highlighted]:bg-elevated data-[highlighted]:text-white",
      "data-[state=checked]:bg-elevated data-[state=checked]:text-white",
      className,
    )}
    {...rest}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export {
  SelectRoot as Root,
  SelectGroup as Group,
  SelectValue as Value,
  SelectTrigger as Trigger,
  SelectContent as Content,
  SelectItem as Item,
};
