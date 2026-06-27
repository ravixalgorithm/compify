"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowUpLine } from "@remixicon/react";
import { useOptionalAuth } from "./AuthProvider";

/**
 * Admin-only overlay on a card in the Featured view. Clicking it moves the
 * component to the top of the Featured order (sets its featured_position) and
 * refreshes. Independent of the home-grid "move to top" pin. Rendered inside the
 * card's <Link>, so it stops propagation to avoid navigating.
 */
export function AdminFeaturedUpButton({ slug }: { slug: string }) {
  const auth = useOptionalAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!auth?.isAdmin) return null;

  async function moveToTop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/components/featured/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const detail = await res.json().catch(() => ({}));
        const message = (detail as { error?: string }).error ?? `HTTP ${res.status}`;
        console.error("[featured-move-to-top] failed:", message);
        window.alert(`Move to top failed: ${message}`);
      }
    } catch (err) {
      console.error("[featured-move-to-top] request error:", err);
      window.alert(`Move to top failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={moveToTop}
      disabled={busy}
      aria-label="Move to top of featured"
      title="Move to top of featured"
      className="ui-press absolute right-2 top-2 z-20 flex size-8 items-center justify-center border border-stroke bg-bg/85 text-white backdrop-blur transition hover:bg-accent hover:text-black disabled:opacity-60"
    >
      <RiArrowUpLine size={16} />
    </button>
  );
}
