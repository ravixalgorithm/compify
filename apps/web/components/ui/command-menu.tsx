// Figma 147:4077 — search command palette (panel 147:4078)



"use client";



import * as React from "react";

import { type DialogProps } from "@radix-ui/react-dialog";

import { Command } from "cmdk";

import * as Modal from "@/components/ui/modal";

import { cn } from "@/lib/cn";



const CommandDialogTitle = Modal.Title;

const CommandDialogDescription = Modal.Description;



const CommandDialog = ({

  children,

  className,

  overlayClassName,

  shouldFilter = true,

  ...rest

}: DialogProps & {

  className?: string;

  overlayClassName?: string;

  shouldFilter?: boolean;

}) => {

  return (

    <Modal.Root {...rest}>

      <Modal.Content

        overlayClassName={overlayClassName}

        showClose={false}

        className={cn(

          "relative box-border h-[383px] max-h-[calc(100vh-2rem)] w-[480px] max-w-[calc(100vw-2rem)] shrink-0 overflow-clip bg-[#1b1b1b] px-[12px] py-[10px] font-mono",

          className,

        )}

      >

        <Command

          shouldFilter={shouldFilter}

          className="flex h-full min-h-0 flex-col gap-[10px]"

          loop

        >

          {children}

        </Command>

        <div

          className="pointer-events-none absolute left-[12px] top-[315px] h-[67px] w-[456px] bg-gradient-to-b from-[rgba(27,27,27,0)] to-[#1b1b1b]"

          aria-hidden

        />

      </Modal.Content>

    </Modal.Root>

  );

};



const CommandInput = React.forwardRef<

  React.ComponentRef<typeof Command.Input>,

  React.ComponentPropsWithoutRef<typeof Command.Input>

>(({ className, ...rest }, forwardedRef) => {

  return (

    <Command.Input

      ref={forwardedRef}

      className={cn(

        "w-full min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[16px] tracking-[-0.48px] text-white outline-none",

        "placeholder:font-normal placeholder:text-[#b8b8b8]",

        "focus:outline-none",

        className,

      )}

      {...rest}

    />

  );

});

CommandInput.displayName = "CommandInput";



const CommandList = React.forwardRef<

  React.ComponentRef<typeof Command.List>,

  React.ComponentPropsWithoutRef<typeof Command.List>

>(({ className, ...rest }, forwardedRef) => {

  return (

    <Command.List

      ref={forwardedRef}

      className={cn(

        "no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",

        "[&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col [&_[cmdk-list-sizer]]:gap-[10px]",

        className,

      )}

      {...rest}

    />

  );

});

CommandList.displayName = "CommandList";



const CommandGroup = React.forwardRef<

  React.ComponentRef<typeof Command.Group>,

  React.ComponentPropsWithoutRef<typeof Command.Group>

>(({ className, ...rest }, forwardedRef) => {

  return (

    <Command.Group

      ref={forwardedRef}

      className={cn(

        "flex w-full flex-col",

        "[&_[cmdk-group-heading]]:mb-[10px] [&_[cmdk-group-heading]]:px-[8px]",

        "[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-normal [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:leading-normal [&_[cmdk-group-heading]]:tracking-[-0.24px] [&_[cmdk-group-heading]]:text-[#b8b8b8]",

        className,

      )}

      {...rest}

    />

  );

});

CommandGroup.displayName = "CommandGroup";



const CommandItem = React.forwardRef<

  React.ComponentRef<typeof Command.Item>,

  React.ComponentPropsWithoutRef<typeof Command.Item>

>(({ className, ...rest }, forwardedRef) => {

  return (

    <Command.Item

      ref={forwardedRef}

      className={cn(

        "flex w-full cursor-pointer items-center gap-[6px] border border-solid border-transparent px-[8px] py-[10px] text-left outline-none ui-micro",
        "text-[14px] font-normal leading-normal tracking-[-0.42px] text-white",
        "data-[selected=true]:bg-[#121212]",

        className,

      )}

      {...rest}

    />

  );

});

CommandItem.displayName = "CommandItem";



function CommandItemIcon({

  className,

  as: Component = "div",

  ...rest

}: {

  className?: string;

  as?: React.ElementType;

} & React.HTMLAttributes<HTMLElement>) {

  return <Component className={cn("size-[16px] shrink-0 text-white", className)} {...rest} />;

}



function CommandEmpty({

  className,

  ...rest

}: React.ComponentPropsWithoutRef<typeof Command.Empty>) {

  return (

    <Command.Empty

      className={cn("px-[8px] py-[10px] text-[14px] font-normal tracking-[-0.42px] text-[#b8b8b8]", className)}

      {...rest}

    />

  );

}



export {

  CommandDialog as Dialog,

  CommandDialogTitle as DialogTitle,

  CommandDialogDescription as DialogDescription,

  CommandInput as Input,

  CommandList as List,

  CommandGroup as Group,

  CommandItem as Item,

  CommandItemIcon as ItemIcon,

  CommandEmpty as Empty,

};


