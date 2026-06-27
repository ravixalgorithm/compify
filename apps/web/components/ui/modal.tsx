// shadcn Dialog + Framer Motion — Compify tokens
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  microTransition,
  modalContentVariants,
  modalOverlayVariants,
} from "@/lib/motion";

const ModalOpenContext = React.createContext(false);

const ModalRoot = ({
  open = false,
  ...rest
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) => {
  return (
    <ModalOpenContext.Provider value={Boolean(open)}>
      <DialogPrimitive.Root open={open} {...rest} />
    </ModalOpenContext.Provider>
  );
};

const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;
const ModalPortal = DialogPrimitive.Portal;

const ModalOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Overlay ref={forwardedRef} asChild forceMount {...rest}>
      <motion.div
        className={cn(
          "fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]",
          className,
        )}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={modalOverlayVariants}
        transition={microTransition}
      />
    </DialogPrimitive.Overlay>
  );
});
ModalOverlay.displayName = "ModalOverlay";

const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
    showClose?: boolean;
    /** Stacking layer for the whole modal. Default z-50; raise above z-[100]
     *  popovers (Select/Tooltip) when a modal must sit on top of them. */
    zIndexClass?: string;
  }
>(({ className, overlayClassName, children, showClose: _showClose = true, zIndexClass = "z-50", ...rest }, forwardedRef) => {
  const open = React.useContext(ModalOpenContext);

  return (
    <AnimatePresence mode="wait">
      {open ? (
        <ModalPortal forceMount>
          <div className={cn("fixed inset-0 flex items-center justify-center overflow-y-auto p-4", zIndexClass)}>
            <ModalOverlay className={overlayClassName} />
            <DialogPrimitive.Content asChild forceMount {...rest}>
              <motion.div
                ref={forwardedRef}
                className={cn(
                  "relative z-50 max-w-[calc(100vw-2rem)] shrink-0 focus:outline-none",
                  className,
                )}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={modalContentVariants}
                transition={microTransition}
              >
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </div>
        </ModalPortal>
      ) : null}
    </AnimatePresence>
  );
});
ModalContent.displayName = "ModalContent";

const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Title
      ref={forwardedRef}
      className={cn("text-[14px] tracking-[-0.42px] text-white", className)}
      {...rest}
    />
  );
});
ModalTitle.displayName = "ModalTitle";

const ModalDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Description
      ref={forwardedRef}
      className={cn("text-[12px] tracking-[-0.24px] text-muted", className)}
      {...rest}
    />
  );
});
ModalDescription.displayName = "ModalDescription";

export {
  ModalRoot as Root,
  ModalTrigger as Trigger,
  ModalClose as Close,
  ModalPortal as Portal,
  ModalOverlay as Overlay,
  ModalContent as Content,
  ModalTitle as Title,
  ModalDescription as Description,
};
