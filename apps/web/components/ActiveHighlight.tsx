"use client";

/**
 * Active row background — a simple static highlight (no wipe animation).
 * Render it as the first child of a `relative` row; keep the row's real content
 * at `z-10`. The `enterOnMount` prop is accepted for call-site compatibility but
 * no longer affects anything.
 */
export function ActiveBg({
  active,
  className = "absolute inset-0 bg-elevated",
}: {
  active: boolean;
  className?: string;
  enterOnMount?: boolean;
}) {
  if (!active) return null;
  return <span className={className} />;
}

/** The little active dot — shown only when active. */
export function ActiveDot({
  active,
}: {
  active: boolean;
  enterOnMount?: boolean;
}) {
  if (!active) return null;
  return <span className="size-[4px] bg-white" />;
}
