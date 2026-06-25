"use client";

import { Toaster as Sonner, toast } from "sonner";
import { RiCheckboxCircleLine, RiCloseCircleLine } from "@remixicon/react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * App toaster — dark-only, styled to the Figma card (215:2690): #151414 surface,
 * #212121 border, rounded-10, leading icon + title/description. Use the
 * `toastError` / `toastSuccess` helpers so the icons stay on-system.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group font-mono"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-mono group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-3 group-[.toaster]:rounded-[10px] group-[.toaster]:border group-[.toaster]:border-stroke group-[.toaster]:bg-surface group-[.toaster]:p-4 group-[.toaster]:text-white group-[.toaster]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
          content: "group-[.toast]:gap-1",
          title:
            "group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:tracking-[-0.42px] group-[.toast]:text-white",
          description:
            "group-[.toast]:text-xsm group-[.toast]:tracking-[-0.39px] group-[.toast]:text-[#b8b8b8]",
          icon: "group-[.toast]:m-0 group-[.toast]:size-6 group-[.toast]:shrink-0 group-[.toast]:items-center group-[.toast]:justify-center",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-elevated group-[.toast]:text-[#b8b8b8]",
        },
      }}
      {...props}
    />
  );
}

/** Error toast — Figma 215:2690 (red close-circle + title/description). */
export function toastError(title: string, description?: string) {
  return toast(title, {
    description,
    icon: <RiCloseCircleLine size={24} className="shrink-0 text-[#ef4444]" />,
  });
}

/** Success toast — same card with a green check-circle. */
export function toastSuccess(title: string, description?: string) {
  return toast(title, {
    description,
    icon: <RiCheckboxCircleLine size={24} className="shrink-0 text-[#4ade80]" />,
  });
}
