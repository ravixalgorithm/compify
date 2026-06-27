"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RiCheckLine, RiDeleteBin5Line, RiFileCopyLine, RiKey2Line } from "@remixicon/react";
import { toastSuccess } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { emitApiKeysChanged } from "@/lib/api-keys-events";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  key: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function ApiKeysPanel({ onClose }: { onClose?: () => void }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  // Full plaintext key, held only in-memory right after creation.
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which confirmation dialog is open, if any.
  const [confirm, setConfirm] = useState<"replace" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeKey = keys.find((k) => !k.revoked_at) ?? null;

  async function loadKeys() {
    try {
      const res = await fetch("/api/api-keys");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load API keys");
      setKeys(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || creating) return;
    // Replacing an existing key revokes it — confirm first.
    if (activeKey) {
      setConfirm("replace");
      return;
    }
    void createKey();
  }

  async function createKey() {
    setConfirm(null);
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create API key");
      const newKey = payload.data as ApiKeyRow;
      setCreatedKey(newKey.key);
      setName("");
      // Show the new key immediately from the POST response — one active key per
      // user, so any older keys are now revoked. Reconcile with the server in the
      // background instead of blocking on a second fetch.
      const revokedAt = new Date().toISOString();
      setKeys((prev) => [
        newKey,
        ...prev
          .filter((k) => k.id !== newKey.id)
          .map((k) => (k.revoked_at ? k : { ...k, revoked_at: revokedAt })),
      ]);
      void loadKeys();
      emitApiKeysChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey() {
    if (!activeKey) return;
    setConfirm(null);
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/api-keys/${activeKey.id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to delete key");
      setCreatedKey(null);
      await loadKeys();
      emitApiKeysChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete key");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopy() {
    const value = activeKey?.key ?? createdKey ?? activeKey?.prefix;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toastSuccess("API key copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const fullKey = activeKey?.key ?? createdKey ?? null;
  const maskedKey = activeKey
    ? fullKey
      ? `${activeKey.prefix}••••${fullKey.slice(-4)}`
      : `${activeKey.prefix}••••••••`
    : "";

  return (
    <div className="flex w-full flex-col gap-[14px] pr-[2px]">
      <div className="flex flex-col gap-[4px]">
        <h2 className="text-[16px] leading-[26px] tracking-[-0.48px] text-white">
          API Integration
        </h2>
        <p className="text-[12px] leading-[1.5] tracking-[-0.12px] text-[#b8b8b8]">
          Connect Cursor, Claude Code, and other MCP clients.{" "}
          <Link
            href="/integrations?tab=mcp"
            onClick={onClose}
            className="font-medium text-white underline underline-offset-2"
          >
            Connection docs
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[6px]">
        <span className="text-[14px] tracking-[-0.42px] text-white">
          {activeKey ? "Replace API key" : "Create API key"}
        </span>
        <div className="flex items-center gap-[8px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production Main"
            disabled={creating}
            className="h-[38px] min-w-0 flex-1 bg-[#2b2b2b] pl-[12px] pr-[10px] text-[14px] tracking-[-0.42px] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)] outline-none placeholder:text-[#a3a3a3] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="ui-press ui-micro flex h-[38px] shrink-0 items-center justify-center bg-white px-[16px] text-[14px] font-medium tracking-[-0.42px] text-black hover:bg-white/90 disabled:opacity-60"
          >
            {creating ? "Creating…" : activeKey ? "Replace" : "Create"}
          </button>
        </div>
        <p className="text-[11px] leading-[1.5] tracking-[-0.12px] text-[#b8b8b8]">
          One active key at a time.{activeKey ? " Creating a new key revokes the current one." : ""}
        </p>
      </form>

      {loading ? (
        <p className="text-[12px] text-[#b8b8b8]">Loading…</p>
      ) : activeKey ? (
        <>
          {/* Figma 245:1040 — active key row */}
          <div className="flex w-full items-center gap-[16px] border-b border-[#2b2b2b] py-[16px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <p className="w-full truncate text-[14px] font-medium tracking-[-0.42px] text-white">
                {activeKey.name}
              </p>
              <p className="w-full truncate font-mono text-[13px] tracking-[-0.39px] text-[#b8b8b8]">
                {maskedKey}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-[8px]">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy API key"
                className="ui-press ui-micro flex items-center border border-[#2b2b2b] p-[6px] text-[#b8b8b8] hover:text-white"
              >
                {copied ? <RiCheckLine size={18} /> : <RiFileCopyLine size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                aria-label="Delete API key"
                className="ui-press ui-micro flex items-center border border-[#ffd3d3] bg-[#ffd3d3] p-[6px] text-[#d92d20] hover:bg-[#ffc2c2]"
              >
                <RiDeleteBin5Line size={18} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex w-full flex-col items-center gap-[10px] border border-dashed border-[#2b2b2b] bg-[#161616] px-[16px] py-[28px] text-center">
          <RiKey2Line size={24} className="text-[#666]" />
          <div className="flex flex-col gap-[2px]">
            <p className="text-sm font-medium tracking-[-0.42px] text-white">No API key yet</p>
            <p className="text-xs leading-[1.5] tracking-[-0.12px] text-[#b8b8b8]">
              Create a key above to connect your editor and start using the MCP server.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-[12px] text-[#ff6b6b]" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirm === "replace"}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void createKey()}
        icon={<RiKey2Line size={20} />}
        title="Replace API key?"
        description={
          activeKey ? (
            <>
              Creating a new key revokes{" "}
              <span className="text-white">{activeKey.name}</span>. Agents using it lose access
              immediately.
            </>
          ) : null
        }
        confirmLabel={creating ? "Replacing…" : "Replace"}
        loading={creating}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => void deleteKey()}
        destructive
        icon={<RiDeleteBin5Line size={20} />}
        title="Delete API key?"
        description={
          activeKey ? (
            <>
              <span className="text-white">{activeKey.name}</span> will stop working immediately and
              any agents using it lose access.
            </>
          ) : null
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        loading={deleting}
      />
    </div>
  );
}
