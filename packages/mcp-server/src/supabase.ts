import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Shared Supabase client for the MCP server (DB reads + stats). */
function supabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role bypasses RLS; the anon/publishable key can still read
  // published components (public read policy) and call the stats RPCs.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, key } = supabaseEnv();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
