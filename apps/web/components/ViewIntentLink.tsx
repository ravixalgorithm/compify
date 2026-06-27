"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { markViewIntent } from "@/lib/view-intent";
import { useOptimisticNavigate } from "@/lib/optimistic-nav";

/**
 * Drop-in for next/link used by the links that navigate to a component detail
 * page (gallery cards, sidebar entries, variants, intro showcase). Marks a
 * "view intent" on click so the detail page counts the view once for this
 * deliberate selection — refreshes and pasted URLs don't set it, so they don't
 * inflate the count. Also flips the optimistic pathname so the sidebar slides
 * to the detail rail and highlights the row instantly, before the (force-
 * dynamic) detail page has rendered. Renders fine inside server components.
 */
export function ViewIntentLink({
  slug,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { slug: string }) {
  const navigate = useOptimisticNavigate();
  return (
    <Link
      {...rest}
      onClick={(e) => {
        markViewIntent(slug);
        if (typeof rest.href === "string") navigate(rest.href, e);
        onClick?.(e);
      }}
    />
  );
}
