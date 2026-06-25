"use client";

/**
 * "View intent" — a short-lived marker that a component detail page was reached
 * by the user deliberately *choosing* a component (clicking a gallery card, a
 * sidebar entry, a variant, the intro showcase, or a search result), rather than
 * by a plain refresh or a pasted URL.
 *
 * The detail page consumes the marker on mount: if it's present (and fresh) the
 * view is counted once; otherwise the page just reads the current stats. This
 * stops a refresh from inflating the view count past the copy count.
 */
const KEY = "compify:view-intent";
// A click immediately navigates, so the detail page mounts within a moment. Keep
// the window short so a stale marker can't get consumed by a much later refresh.
const TTL_MS = 15_000;

export function markViewIntent(slug: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ slug, t: Date.now() }));
  } catch {
    /* sessionStorage unavailable — view simply won't be counted */
  }
}

/** Returns true once (clearing the marker) if a fresh intent exists for `slug`. */
export function consumeViewIntent(slug: string): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { slug?: string; t?: number };
    if (parsed.slug !== slug) return false;
    if (typeof parsed.t !== "number" || Date.now() - parsed.t > TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}
