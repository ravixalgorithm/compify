"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RiArrowDownSLine, RiFileCopyLine } from "@remixicon/react";
import type { RegistryEntry, TweakState } from "@compify/shared";
import { useOptionalAuth } from "@/components/AuthProvider";
import { microTransition } from "@/lib/motion";
import { GetComponentModal, type Workflow } from "./GetComponentModal";

const WORKFLOW_KEY = "compify-copy-workflow";

/** Figma 170:757 — split copy button. Both halves open the workflow modal (the
 *  actual copy happens in the modal); the chevron also rotates while open. */
export function CopyDropdown({
  entry,
  source,
  state,
}: {
  entry: RegistryEntry;
  source: string;
  state: TweakState;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [workflow, setWorkflowState] = useState<Workflow>("framer");
  const auth = useOptionalAuth();

  // Restore the last-chosen workflow on mount (defaults to Framer).
  useEffect(() => {
    const stored = window.localStorage.getItem(WORKFLOW_KEY);
    if (stored === "mcp" || stored === "framer") setWorkflowState(stored);
  }, []);

  function setWorkflow(next: Workflow) {
    setWorkflowState(next);
    try {
      window.localStorage.setItem(WORKFLOW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function openWorkflowModal() {
    // Gate behind auth — signed-out users get the sign-in popup instead of the
    // workflow modal, matching the copy gating in useClipboard.
    if (auth && !auth.user) {
      auth.openSignIn();
      return;
    }
    setModalOpen(true);
  }

  return (
    <>
      {/* Figma 227:2860 — split copy button; both halves open the modal. */}
      <div className="relative shrink-0">
        <div className="flex items-center gap-px bg-white">
          <button
            type="button"
            onClick={openWorkflowModal}
            className="ui-press ui-micro flex items-center gap-[6px] bg-white px-[10px] py-[6px] hover:bg-white/90"
            aria-haspopup="dialog"
            aria-expanded={modalOpen}
            aria-label="Get this component"
          >
            <RiFileCopyLine size={18} className="shrink-0 text-black" />
            <span className="text-lg font-normal leading-normal tracking-[-0.54px] text-black">
              Copy
            </span>
          </button>
          <div className="h-[14.701px] w-px shrink-0 bg-black/10" />
          <button
            type="button"
            onClick={openWorkflowModal}
            className="ui-press ui-micro flex w-[36px] items-center justify-center self-stretch bg-white px-[10px] py-[6px] hover:bg-white/90"
            aria-haspopup="dialog"
            aria-expanded={modalOpen}
            aria-label="Choose copy workflow"
          >
            <motion.span
              animate={{ rotate: modalOpen ? 180 : 0 }}
              transition={microTransition}
              className="inline-flex"
            >
              <RiArrowDownSLine size={18} className="text-black" />
            </motion.span>
          </button>
        </div>
      </div>

      <GetComponentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={entry}
        source={source}
        state={state}
        workflow={workflow}
        onWorkflowChange={setWorkflow}
      />
    </>
  );
}
