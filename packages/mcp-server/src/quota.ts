import { getSupabase } from "./supabase.js";

export type QuotaResult = {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  /** ISO timestamp when the allowance restores (next UTC midnight); null for admins. */
  reset_at: string | null;
};

/** Human "time until reset" from an ISO timestamp, e.g. "3h 24m" or "12m". */
export function formatResetIn(resetAt: string | null): string {
  if (!resetAt) return "";
  const ms = new Date(resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "any moment now";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Consume one unit of the user's shared daily copy/MCP quota (admins unlimited).
 * Returns the result, or `null` when the check can't run (no DB, or the server
 * is configured with a non-service-role key that lacks execute on the function).
 * Callers MUST treat `null` as "allow" so a server misconfig never blocks
 * delivery — the limit just isn't enforced until service-role is configured.
 */
export async function consumeQuota(userId: string): Promise<QuotaResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("consume_copy_quota_for", {
      p_user_id: userId,
    });
    if (error || !data) {
      if (error) console.warn("[quota] consume failed (allowing delivery):", error.message);
      return null;
    }
    return data as QuotaResult;
  } catch (e) {
    console.warn("[quota] consume threw (allowing delivery):", e);
    return null;
  }
}
