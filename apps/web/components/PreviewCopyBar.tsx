"use client";

import type { RegistryEntry, TweakState } from "@compify/shared";
import { encodePrompt, framerCopy } from "@/lib/prompt";
import { hasFramerModule } from "@/lib/framer";
import { useClipboard } from "@/lib/useClipboard";
import { CopyFeedback } from "@/components/ui/copy-feedback";
import { EditorIconStack } from "./EditorIconStack";

export function PreviewCopyBar({
  entry,
  source,
  state,
}: {
  entry: RegistryEntry;
  source: string;
  state: TweakState;
}) {
  const framer = useClipboard();
  const prompt = useClipboard();
  const moduleHosted = hasFramerModule(entry);

  const promptText = encodePrompt(entry, state);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => framer.copy(framerCopy(entry, source, state))}
        className="ui-btn-primary"
      >
        <CopyFeedback
          copied={framer.copied}
          idleLabel={moduleHosted ? "Copy Framer URL" : "Copy to Framer"}
          copiedLabel="Copied"
          iconSize={14}
        />
      </button>
      <button
        type="button"
        onClick={() => prompt.copy(promptText)}
        title="Copy MCP prompt for Claude Code, Cursor, or Codex"
        className="ui-press ui-micro flex h-9 items-center gap-2 rounded-lg border border-stroke bg-surface px-3 text-[13px] font-medium text-foreground hover:border-stroke-hover hover:bg-elevated"
      >
        {prompt.copied ? null : <EditorIconStack />}
        <CopyFeedback
          copied={prompt.copied}
          idleLabel="Copy prompt"
          copiedLabel="Copied"
          iconSize={14}
        />
      </button>
    </div>
  );
}
