"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { RiCloseLine, RiInformationFill, RiPlugLine } from "@remixicon/react";
import { toastSuccess } from "@/components/ui/sonner";
import type { RegistryEntry, TweakState } from "@compify/shared";
import { encodePrompt, framerCopy } from "@/lib/prompt";
import { useClipboard } from "@/lib/useClipboard";
import { incrementCopy } from "@/lib/stats";
import { CopyFeedback } from "@/components/ui/copy-feedback";
import * as Tooltip from "@/components/ui/tooltip";
import * as Modal from "@/components/ui/modal";
import { cn } from "@/lib/cn";

export type Workflow = "mcp" | "framer";

/** Figma 147:9960/9989 — radio: filled white disc + dark center when selected,
 *  white outline ring when not. */
function Radio({ selected }: { selected: boolean }) {
  return (
    <span className="relative block size-[20px] shrink-0" aria-hidden>
      <span
        className={cn(
          "absolute inset-[10%] rounded-full",
          selected ? "bg-white" : "border border-solid border-white",
        )}
      />
      {selected ? (
        <span className="absolute inset-[30%] rounded-full bg-[#1b1b1b]" />
      ) : null}
    </span>
  );
}

/** Framer glyph using currentColor so it tints with the card's selected state. */
function FramerGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.99935 11.0416H4.62435" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path
        d="M13.3757 2.87498H4.91732L9.00065 6.95831H13.3757V2.87498Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M13.0827 11.0417L8.99935 6.95835H4.62435V11.0417L8.99935 15.125V11.0417H13.0827Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const docsLinkClass =
  "text-white underline underline-offset-2 hover:text-white/90";

/** Hover callout on the MCP card info icon. */
function McpSetupInfo() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="MCP setup requirements"
          className="ui-micro inline-flex shrink-0 cursor-help text-[#b8b8b8] hover:text-white"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === " ") e.preventDefault();
          }}
        >
          <RiInformationFill size={20} aria-hidden />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        align="center"
        sideOffset={6}
        showArrow
        className="whitespace-nowrap rounded-[8px] px-2 py-2 tracking-[-0.36px]"
      >
        Install Compify UI MCP server.
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

/** Figma 147:10519 — inline info banner below workflow cards. */
function WorkflowInfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[8px] overflow-hidden rounded-[8px] bg-[#292929] p-[8px]">
      <RiInformationFill size={16} className="shrink-0 text-[#b8b8b8]" />
      <p className="min-w-0 text-[12px] font-normal leading-normal tracking-[-0.36px] text-[#b8b8b8]">
        {children}
      </p>
    </div>
  );
}

/** Figma 147:9952 — radio card. */
function WorkflowCard({
  selected,
  onSelect,
  icon,
  title,
  titleExtra,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  titleExtra?: ReactNode;
  description: string;
}) {
  return (
    <div
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-selected={selected}
      className={cn(
        "ui-press ui-micro flex w-full cursor-pointer items-start gap-[14px] overflow-hidden rounded-[12px] border border-solid bg-[#242424] p-[16px] text-left",
        selected ? "border-white" : "border-[#212121] hover:border-[#2e2e2e]",
      )}
    >
      <span
        className={cn(
          "ui-micro flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a]",
          selected ? "text-white" : "text-[#b8b8b8]",
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[4px] self-stretch">
        <span className="flex items-center gap-[4px]">
          <span className="text-[14px] font-medium leading-[20px] tracking-[-0.42px] text-white">
            {title}
          </span>
          {titleExtra}
        </span>
        <span className="text-[12px] font-normal leading-normal tracking-[-0.36px] text-[#b8b8b8]">
          {description}
        </span>
      </span>
      <span className="shrink-0 self-center">
        <Radio selected={selected} />
      </span>
    </div>
  );
}

/** Figma 147:8876 — get component workflow modal. */
export function GetComponentModal({
  open,
  onClose,
  entry,
  source,
  state,
  workflow,
  onWorkflowChange,
}: {
  open: boolean;
  onClose: () => void;
  entry: RegistryEntry;
  source: string;
  state: TweakState;
  workflow: Workflow;
  onWorkflowChange: (workflow: Workflow) => void;
}) {
  const clipboard = useClipboard();

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  async function handleCopy() {
    const text =
      workflow === "mcp" ? encodePrompt(entry, state) : framerCopy(entry, source, state);
    const copied = await clipboard.copy(text); // gated — opens sign-in if signed out
    if (copied) {
      void incrementCopy(entry.name);
      toastSuccess("Component copied");
      // Auto-close once copied — brief delay so the "Copied" feedback shows.
      window.setTimeout(onClose, 600);
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        showClose={false}
        className="flex w-[480px] shrink-0 flex-col gap-[28px] overflow-hidden bg-[#1b1b1b] p-[26px] font-mono"
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col gap-[8px]">
            <Modal.Title
              id="get-component-title"
              className="text-[20px] font-normal leading-normal tracking-[-0.6px] text-white"
            >
              Get this component
            </Modal.Title>
            <Modal.Description className="w-[392px] max-w-full text-[14px] font-normal leading-normal tracking-[-0.42px] text-[#b8b8b8]">
              Choose your preferred workflow to instantly use this component in your project.
            </Modal.Description>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-press ui-micro flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] p-[2px] text-[#b8b8b8] hover:text-white"
            aria-label="Close"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="flex w-full flex-col gap-[12px]">
          <div className="flex w-full flex-col gap-[8px]">
            <WorkflowCard
              selected={workflow === "mcp"}
              onSelect={() => onWorkflowChange("mcp")}
              icon={<RiPlugLine size={20} />}
              title="Copy with MCP"
              titleExtra={<McpSetupInfo />}
              description="Copy an MCP prompt to pull this component into your editor — AI-assisted setup and updates."
            />
            <WorkflowCard
              selected={workflow === "framer"}
              onSelect={() => onWorkflowChange("framer")}
              icon={<FramerGlyph />}
              title="Copy in Framer"
              description="Copy the component, then paste it straight into your Framer canvas."
            />
          </div>

          {workflow === "mcp" ? (
            <WorkflowInfoBanner>
              Paste the prompt into your agent.{" "}
              <Link href="/connect" onClick={onClose} className={docsLinkClass}>
                Installation docs
              </Link>
            </WorkflowInfoBanner>
          ) : null}

          {workflow === "framer" ? (
            <WorkflowInfoBanner>
              Copy and paste this component into your Framer canvas.
            </WorkflowInfoBanner>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="ui-press ui-micro flex w-full items-center justify-center overflow-hidden bg-white px-[12px] py-[9px] text-[14px] font-medium leading-normal tracking-[-0.42px] text-black hover:bg-white/90"
        >
          <CopyFeedback
            copied={clipboard.copied}
            idleLabel="Click to copy"
            copiedLabel="Copied"
            showIcon={false}
            className="text-[14px] font-medium leading-normal tracking-[-0.42px] text-black"
          />
        </button>
      </Modal.Content>
    </Modal.Root>
  );
}
