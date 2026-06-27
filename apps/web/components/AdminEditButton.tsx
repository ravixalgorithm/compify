"use client";

import Link from "next/link";
import { RiEditLine } from "@remixicon/react";
import { useOptionalAuth } from "@/components/AuthProvider";

/**
 * Admin-only "Edit" button shown next to the Copy button on a component's detail
 * page. Mirrors the Copy button (same padding/height/text), in accent orange.
 * Links straight to the admin edit form. Self-hides for non-admins (and
 * signed-out visitors), so the layout is unchanged for them.
 */
export function AdminEditButton({ slug }: { slug: string }) {
  const auth = useOptionalAuth();
  if (!auth?.isAdmin) return null;

  return (
    <Link
      href={`/admin/components/${slug}`}
      prefetch={false}
      className="ui-press ui-micro flex shrink-0 items-center gap-[6px] bg-accent px-[10px] py-[6px] hover:bg-accent-soft"
      aria-label="Edit component"
      title="Edit component"
    >
      <RiEditLine size={18} className="shrink-0 text-black" />
      <span className="text-lg font-normal leading-normal tracking-[-0.54px] text-black">
        Edit
      </span>
    </Link>
  );
}
