import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "hono";

/**
 * API-key authentication for the MCP endpoint.
 *
 * Keys are issued from the web app (Profile → API Keys) and stored in the
 * Supabase `api_keys` table as a SHA-256 hash. The MCP server verifies an
 * incoming key via the `verify_api_key` SECURITY DEFINER function, so it only
 * needs the publishable (anon) key — the table is never exposed. A service-role
 * key also works if provided.
 */

// Read lazily so an .env file loaded at startup is picked up.
function supabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const { url, key } = supabaseEnv();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Whether the server is configured to verify API keys. */
export function authConfigured(): boolean {
  const { url, key } = supabaseEnv();
  return Boolean(url && key);
}

/**
 * Enforce keys when configured, or when explicitly required. When not
 * configured and not required, the server runs open (local dev convenience).
 */
export function authRequired(): boolean {
  if (process.env.MCP_REQUIRE_API_KEY === "false") return false;
  if (process.env.MCP_REQUIRE_API_KEY === "true") return true;
  return authConfigured();
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Pull the key from `Authorization: Bearer <key>` or `x-api-key`. */
export function extractApiKey(c: Context): string | null {
  const auth = c.req.header("authorization");
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match) return match[1].trim();
  }
  const headerKey = c.req.header("x-api-key");
  return headerKey ? headerKey.trim() : null;
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: string };

export async function verifyApiKey(key: string): Promise<VerifyResult> {
  const supabase = getClient();
  if (!supabase) {
    return { ok: false, reason: "API key verification is not configured." };
  }

  const { data, error } = await supabase.rpc("verify_api_key", {
    p_key_hash: hashApiKey(key),
  });

  if (error) return { ok: false, reason: "Key lookup failed." };
  if (!data) return { ok: false, reason: "Invalid or revoked API key." };

  return { ok: true, userId: data as string };
}
