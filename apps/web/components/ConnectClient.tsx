"use client";

import { useState } from "react";
import { type Editor, connectSnippet } from "@/lib/prompt";
import { useClipboard } from "@/lib/useClipboard";
import { CopyButton } from "@/components/ui/copy-feedback";
import { McpSnippetCode } from "@/components/McpSnippetCode";
import { EditorTabIcon } from "@/components/EditorIconStack";
import { mcpDocs } from "@/lib/mcp-docs-surface";
import { cn } from "@/lib/cn";

const CLIENTS: { id: Editor; label: string }[] = [
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor (or any IDE)" },
];

const EDITOR_HINT: Record<Editor, string> = {
  claude: "Run once in your terminal, then restart Claude Code",
  codex: "Run once in your terminal, then restart Codex",
  cursor: "Settings → MCP — same JSON works in Windsurf, Claude Desktop, and other editors",
};

function snippetLabel(editor: Editor): string {
  if (editor === "claude" || editor === "codex") return "Terminal";
  return ".cursor/mcp.json";
}

export function ConnectClient() {
  const [clientId, setClientId] = useState<Editor>("claude");
  const { copied, copy } = useClipboard();

  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];
  const snippet = connectSnippet(client.id, "prod");

  return (
    <div className="flex flex-col gap-5">
      <div className={cn("border", mcpDocs.border)}>
        <div className="flex" role="tablist" aria-label="MCP client">
          {CLIENTS.map((item) => {
            const selected = item.id === clientId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setClientId(item.id)}
                className={cn(
                  "ui-press ui-micro flex flex-1 items-center justify-start gap-2 border-b border-r px-3 py-2.5 text-left text-xs tracking-[-0.36px] last:border-r-0 sm:text-xsm sm:tracking-[-0.39px]",
                  mcpDocs.border,
                  selected
                    ? "border-b-[#161616] bg-[#161616] font-medium text-white"
                    : cn(mcpDocs.surfaceRaised, "text-[#999] hover:text-white"),
                )}
              >
                <EditorTabIcon editor={item.id} />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className={cn("px-3 py-2.5", mcpDocs.surface)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={mcpDocs.label}>{snippetLabel(client.id)}</p>
              <p className="mt-0.5 text-2xs leading-4 tracking-[-0.33px] text-[#777]">
                {EDITOR_HINT[client.id]}
              </p>
            </div>
            <CopyButton
              copied={copied}
              onCopy={() => copy(snippet)}
              className={cn("shrink-0 pt-0.5", mcpDocs.label, "hover:text-white")}
              iconSize={12}
            />
          </div>
          <McpSnippetCode editor={client.id} code={snippet} />
        </div>
      </div>

      <p className="text-xsm leading-[20px] tracking-[-0.39px] text-[#999]">
        Replace <span className="text-white">&lt;your-api-key&gt;</span> with a key from{" "}
        <span className="text-white">Profile → API Keys</span>. Requests without a valid key are
        rejected.
      </p>
    </div>
  );
}
