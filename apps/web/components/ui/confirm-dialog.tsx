"use client";

import type { ReactNode } from "react";
import * as Modal from "@/components/ui/modal";
import { cn } from "@/lib/cn";

/**
 * App-styled replacement for window.confirm — same modal shell, tokens, and icon
 * treatment as the rest of the product. Controlled via `open`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        showClose={false}
        className="flex w-[413px] flex-col gap-[20px] bg-[#1b1b1b] p-[28px] font-mono shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-start gap-[14px]">
          {icon ? (
            <div
              className={cn(
                "flex size-[40px] shrink-0 items-center justify-center border",
                destructive
                  ? "border-[#ffd3d3] bg-[#ffd3d3] text-[#d92d20]"
                  : "border-[#2b2b2b] bg-[#161616] text-white",
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <Modal.Title className="text-[16px] font-medium leading-[24px] tracking-[-0.48px] text-white">
              {title}
            </Modal.Title>
            {description ? (
              <Modal.Description className="text-[13px] leading-[1.5] tracking-[-0.39px] text-[#b8b8b8]">
                {description}
              </Modal.Description>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="ui-press ui-micro flex h-[38px] items-center justify-center border border-[#2b2b2b] px-[16px] text-[14px] font-medium tracking-[-0.42px] text-white hover:bg-[#2b2b2b] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "ui-press ui-micro flex h-[38px] items-center justify-center px-[16px] text-[14px] font-medium tracking-[-0.42px] disabled:opacity-60",
              destructive
                ? "bg-[#d92d20] text-white hover:bg-[#c42a1e]"
                : "bg-white text-black hover:bg-white/90",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
