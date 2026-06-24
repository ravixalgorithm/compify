import { getSupabase } from "./supabase.js";

/** Best-effort component usage tracking from the MCP server (get_component calls). */

/** Increments a component's copy/use count. Never throws — tracking is best-effort. */
export async function incrementCopy(slug: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.rpc("increment_copy", { p_slug: slug });
  } catch {
    /* ignore */
  }
}
