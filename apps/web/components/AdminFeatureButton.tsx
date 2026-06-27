"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiHeartFill, RiHeartLine } from "@remixicon/react";
import { useOptionalAuth } from "./AuthProvider";
import { cn } from "@/lib/cn";

/**
 * Admin-only overlay heart on a gallery card. Clicking it toggles the
 * component's `featured` flag instantly (optimistic, with revert on failure)
 * and refreshes so the Featured view updates. Rendered inside the card frame,
 * it stops propagation so it doesn't trigger navigation.
 */
export function AdminFeatureButton({
  slug,
  featured = false,
}: {
  slug: string;
  featured?: boolean;
}) {
  const auth = useOptionalAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(featured);

  if (!auth?.isAdmin) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !on;
    setOn(next); // optimistic
    setBusy(true);
    try {
      const res = await fetch("/api/admin/components/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, featured: next }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setOn(!next); // revert
        const detail = await res.json().catch(() => ({}));
        const message = (detail as { error?: string }).error ?? `HTTP ${res.status}`;
        console.error("[feature] failed:", message);
        window.alert(`Feature toggle failed: ${message}`);
      }
    } catch (err) {
      setOn(!next); // revert
      console.error("[feature] request error:", err);
      window.alert(`Feature toggle failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={on ? "Remove from featured" : "Mark as featured"}
      aria-pressed={on}
      title={on ? "Featured — click to unfeature" : "Mark as featured"}
      className={cn(
        "ui-press absolute left-2 top-2 z-20 flex size-8 items-center justify-center border border-stroke bg-bg/85 backdrop-blur transition disabled:opacity-60",
        on ? "text-red-400 hover:bg-red-500/20" : "text-white hover:bg-accent hover:text-black",
      )}
    >
      {on ? <RiHeartFill size={16} /> : <RiHeartLine size={16} />}
    </button>
  );
}
