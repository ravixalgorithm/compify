"use client";

import { createClient } from "@/utils/supabase/client";

/**
 * Daily copy / MCP quota for the signed-in user. Non-admins get a fixed number
 * of component deliveries per day (website Copy + MCP get_component share one
 * counter); admins are unlimited (`unlimited: true`, null limit/remaining).
 */
export type CopyQuota = {
  /** Present only on consume calls — whether this action was permitted. */
  allowed?: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  /** ISO timestamp when the allowance restores (next UTC midnight); null for admins. */
  reset_at: string | null;
};

/**
 * Human "time until reset" from an ISO timestamp, e.g. "3h 24m" or "12m".
 * Pass `now` (ms) so a ticking caller re-renders without recomputing Date.now().
 */
export function formatResetIn(resetAt: string | null | undefined, now: number): string {
  if (!resetAt) return "";
  const ms = new Date(resetAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "any moment now";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Consume one unit of quota for the current action. Returns null on error. */
export async function consumeCopyQuota(): Promise<CopyQuota | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("consume_copy_quota");
    if (error || !data) return null;
    return data as CopyQuota;
  } catch {
    return null;
  }
}

/** Read current quota without consuming (for the Profile meter). */
export async function getCopyQuota(): Promise<CopyQuota | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_copy_quota");
    if (error || !data) return null;
    return data as CopyQuota;
  } catch {
    return null;
  }
}

// Cross-component signal so the Profile meter refreshes the moment a copy is
// consumed elsewhere (without a reload).
const EVENT = "compify:quota-changed";

export function emitQuotaChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function onQuotaChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
