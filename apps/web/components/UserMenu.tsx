"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowDownSLine,
  RiFeedbackLine,
  RiSettingsLine,
} from "@remixicon/react";
import { useUser } from "./AuthProvider";
import { ProfileSettingsModal } from "./profile/ProfileSettingsModal";
import { FeedbackModal } from "./FeedbackModal";
import { microTransition } from "@/lib/motion";
import { cn } from "@/lib/cn";

function FooterItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-[8px] px-[14px] py-[9px] text-left"
    >
      <span
        className={cn(
          "ui-micro flex shrink-0 items-center",
          active ? "text-white" : "text-[#b8b8b8] group-hover:text-white",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "ui-micro whitespace-nowrap text-[14px] tracking-[-0.42px]",
          active ? "text-white" : "text-[#b8b8b8] group-hover:text-white",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function UserMenu() {
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setExpanded(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!user) return null;

  return (
    <div
      ref={containerRef}
      className="flex w-full shrink-0 flex-col gap-[4px] border-t border-[#2e3132] bg-elevated py-[2px]"
    >
      {/* Figma 227:861 / 227:1070 — Account Setting row */}
      <div className="flex w-full items-center justify-between px-[14px] py-[9px]">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          className="group flex min-w-0 items-center gap-[8px] text-left"
        >
          <RiSettingsLine
            size={18}
            className="ui-micro shrink-0 text-[#b8b8b8] group-hover:text-white"
          />
          <span className="ui-micro truncate text-[14px] tracking-[-0.42px] text-[#b8b8b8] group-hover:text-white">
            Account Setting
          </span>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide account menu" : "Show account menu"}
          className="ui-micro flex shrink-0 items-center justify-center p-[2px] text-[#b8b8b8] hover:text-white"
        >
          <RiArrowDownSLine
            size={16}
            className={cn("ui-micro", expanded && "-scale-y-100")}
          />
        </button>
      </div>

      {/* Expandable menu — Share Feedback */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={microTransition}
            className="flex w-full flex-col gap-[4px] overflow-hidden"
          >
            <FooterItem
              icon={<RiFeedbackLine size={18} />}
              label="Share Feedback"
              onClick={() => {
                setFeedbackOpen(true);
                setExpanded(false);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ProfileSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
