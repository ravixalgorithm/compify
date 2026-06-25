"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiKey2Line,
} from "@remixicon/react";
import { type Editor, connectSnippet } from "@/lib/prompt";
import { useClipboard } from "@/lib/useClipboard";
import { useUser } from "@/components/AuthProvider";
import { emitApiKeysChanged, onApiKeysChanged } from "@/lib/api-keys-events";
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

interface ApiKeyRow {
  key: string | null;
  revoked_at: string | null;
}

// Mirrors the API Keys column: keep the visible prefix, mask the secret, expose
// only the last 4 chars. cmp_live_ + 6 chars stay visible (see lib/api-keys.ts).
const KEY_PREFIX_LEN = "cmp_live_".length + 6;

function maskKey(key: string): string {
  if (key.length <= KEY_PREFIX_LEN + 4) return key;
  return `${key.slice(0, KEY_PREFIX_LEN)}••••${key.slice(-4)}`;
}

function snippetLabel(editor: Editor): string {
  if (editor === "claude" || editor === "codex") return "Terminal";
  return ".cursor/mcp.json";
}

/** Standalone key display — masked by default, with reveal + copy, like the API Keys column. */
function ApiKeyField({ apiKey }: { apiKey: string }) {
  const { copied, copy } = useClipboard();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={cn(mcpDocs.card, "flex items-center gap-3 px-4 py-3")}>
      <div className="min-w-0 flex-1">
        <p className={mcpDocs.label}>Your API key</p>
        <p className="mt-1 truncate font-mono text-[13px] tracking-[-0.39px] text-white">
          {revealed ? apiKey : maskKey(apiKey)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-[8px]">
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide API key" : "Show API key"}
          className="ui-press ui-micro flex items-center border border-[#2b2b2b] p-[6px] text-[#b8b8b8] hover:text-white"
        >
          {revealed ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
        </button>
        <button
          type="button"
          onClick={() => copy(apiKey)}
          aria-label="Copy API key"
          className="ui-press ui-micro flex items-center border border-[#2b2b2b] p-[6px] text-[#b8b8b8] hover:text-white"
        >
          {copied ? <RiCheckLine size={18} /> : <RiFileCopyLine size={18} />}
        </button>
      </div>
    </div>
  );
}

function ClientCard({ id, label, apiKey }: { id: Editor; label: string; apiKey?: string }) {
  const { copied, copy } = useClipboard();
  // Copy the real key; display it masked so the secret isn't shown on screen.
  const copySnippet = connectSnippet(id, "prod", apiKey);
  const displaySnippet = connectSnippet(id, "prod", apiKey ? maskKey(apiKey) : undefined);

  return (
    <div className={cn("border", mcpDocs.border)}>
      <div
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2.5",
          mcpDocs.border,
          mcpDocs.surfaceRaised,
        )}
      >
        <EditorTabIcon editor={id} />
        <span className="ui-micro min-w-0 truncate text-sm font-medium tracking-[-0.39px] text-white">
          {label}
        </span>
      </div>

      <div className={cn("px-3 py-2.5", mcpDocs.surface)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={mcpDocs.label}>{snippetLabel(id)}</p>
            <p className="mt-0.5 text-2xs leading-4 tracking-[-0.33px] text-[#777]">
              {EDITOR_HINT[id]}
            </p>
          </div>
          <CopyButton
            copied={copied}
            onCopy={() => copy(copySnippet)}
            className={cn("shrink-0 pt-0.5", mcpDocs.label, "hover:text-white")}
            iconSize={12}
          />
        </div>
        <McpSnippetCode editor={id} code={displaySnippet} />
      </div>
    </div>
  );
}

export function ConnectClient() {
  const { user, loading: authLoading, openSignIn } = useUser();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull the signed-in user's active key (plaintext is returned by the API for
  // the owner) so we can embed it directly in the connect commands.
  const loadKey = useCallback(async (): Promise<void> => {
    if (!user) {
      setApiKey(null);
      setKeyLoading(false);
      return;
    }
    setKeyLoading(true);
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error();
      const payload = (await res.json()) as { data?: ApiKeyRow[] };
      const live = (payload.data ?? []).find((k) => !k.revoked_at);
      setApiKey(live?.key ?? null);
    } catch {
      setApiKey(null);
    } finally {
      setKeyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadKey();
  }, [loadKey]);

  // Refresh when a key is created/deleted elsewhere (e.g. profile panel) so this
  // view flips to the create/filled-in state without a reload.
  useEffect(() => onApiKeysChanged(() => void loadKey()), [loadKey]);

  async function handleCreate() {
    if (creating) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "MCP Connect" }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create API key");
      setApiKey((payload.data as ApiKeyRow).key ?? null);
      emitApiKeysChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Signed in with a key — show it standalone, masked, with reveal + copy. */}
      {user && apiKey ? <ApiKeyField apiKey={apiKey} /> : null}

      {/* Signed in, no key yet — offer one-click generation so the commands fill in. */}
      {user && !apiKey && !keyLoading ? (
        <div
          className={cn(
            mcpDocs.card,
            "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="flex items-start gap-3">
            <RiKey2Line size={18} className="mt-0.5 shrink-0 text-[#fa7319]" />
            <div className="min-w-0">
              <p className="text-base font-medium tracking-[-0.42px] text-white">
                Create an API key
              </p>
              <p className="mt-0.5 text-sm leading-[20px] tracking-[-0.39px] text-[#b8b8b8]">
                Generate a key and we&rsquo;ll drop it straight into the commands below — no manual
                editing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="ui-press ui-micro flex h-[38px] shrink-0 items-center justify-center bg-white px-[16px] text-[14px] font-medium tracking-[-0.42px] text-black hover:bg-white/90 disabled:opacity-60"
          >
            {creating ? "Generating…" : "Generate API key"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {CLIENTS.map((item) => (
          <ClientCard key={item.id} id={item.id} label={item.label} apiKey={apiKey ?? undefined} />
        ))}
      </div>

      {error ? (
        <p className="text-sm tracking-[-0.39px] text-[#ff6b6b]" role="alert">
          {error}
        </p>
      ) : null}

      {/* Footer note adapts to auth + key state. */}
      {authLoading ? null : !user ? (
        <p className="text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
          Replace <span className="text-white">&lt;your-api-key&gt;</span> with your key.{" "}
          <button
            type="button"
            onClick={() => openSignIn()}
            className="font-medium text-white underline underline-offset-2 hover:text-[#fa7319]"
          >
            Sign in
          </button>{" "}
          to fill it in automatically.
        </p>
      ) : apiKey ? (
        <p className="text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
          Your API key is filled in above (masked for safety) — copy to get the full command, ready
          to run. Manage it in <span className="text-white">Profile → API Keys</span>.
        </p>
      ) : (
        <p className="text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
          Generate a key above to fill the commands in automatically. You can also manage keys in{" "}
          <span className="text-white">Profile → API Keys</span>.
        </p>
      )}
    </div>
  );
}
