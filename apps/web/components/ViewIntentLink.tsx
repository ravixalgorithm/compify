"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { markViewIntent } from "@/lib/view-intent";

/**
 * Drop-in for next/link used by the links that navigate to a component detail
 * page (gallery cards, sidebar entries, variants, intro showcase). Marks a
 * "view intent" on click so the detail page counts the view once for this
 * deliberate selection — refreshes and pasted URLs don't set it, so they don't
 * inflate the count. Renders fine inside server components.
 */
export function ViewIntentLink({
  slug,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { slug: string }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        markViewIntent(slug);
        onClick?.(e);
      }}
    />
  );
}
