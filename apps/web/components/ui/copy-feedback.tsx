"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { microTransition, swapVariants } from "@/lib/motion";

export function CopyFeedback({
  copied,
  idleLabel = "Copy",
  copiedLabel = "Copied",
  iconSize = 12,
  idleIcon,
  copiedIcon,
  showIcon = true,
  className,
}: {
  copied: boolean;
  idleLabel?: string;
  copiedLabel?: string;
  iconSize?: number;
  /** Override the default lucide Copy icon. */
  idleIcon?: ReactNode;
  /** Override the default lucide Check icon. */
  copiedIcon?: ReactNode;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {showIcon ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied-icon" : "copy-icon"}
            variants={swapVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={microTransition}
            className="inline-flex shrink-0"
          >
            {copied
              ? (copiedIcon ?? <Check size={iconSize} />)
              : (idleIcon ?? <Copy size={iconSize} />)}
          </motion.span>
        </AnimatePresence>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied-label" : "copy-label"}
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={microTransition}
        >
          {copied ? copiedLabel : idleLabel}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function CopyButton({
  copied,
  onCopy,
  idleLabel = "Copy",
  copiedLabel = "Copied",
  iconSize = 12,
  className,
}: {
  copied: boolean;
  onCopy: () => void;
  idleLabel?: string;
  copiedLabel?: string;
  iconSize?: number;
  className?: string;
}) {
  return (
    <button type="button" onClick={onCopy} className={cn("ui-press ui-micro", className)}>
      <CopyFeedback
        copied={copied}
        idleLabel={idleLabel}
        copiedLabel={copiedLabel}
        iconSize={iconSize}
      />
    </button>
  );
}
