"use client";

import { createClient } from "@/utils/supabase/client";

export type ComponentStats = { views: number; copies: number };

type StatsRow = { views: number | string; copies: number | string } | null;

function toStats(row: StatsRow): ComponentStats | null {
  if (!row) return null;
  return { views: Number(row.views), copies: Number(row.copies) };
}

/** Increments a component's view count (one per page load) and returns the new totals. */
export async function incrementView(slug: string): Promise<ComponentStats | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("increment_view", { p_slug: slug });
    if (error) return null;
    return toStats(data as StatsRow);
  } catch {
    return null;
  }
}

/** Increments a component's copy/use count and notifies any live listeners. */
export async function incrementCopy(slug: string): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("compify:copy", { detail: { slug } }));
  }
  try {
    const supabase = createClient();
    await supabase.rpc("increment_copy", { p_slug: slug });
  } catch {
    /* best-effort */
  }
}
