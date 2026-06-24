import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Best-effort component usage tracking from the MCP server (get_component calls). */

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

/** Increments a component's copy/use count. Never throws — tracking is best-effort. */
export async function incrementCopy(slug: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  try {
    await supabase.rpc("increment_copy", { p_slug: slug });
  } catch {
    /* ignore */
  }
}
