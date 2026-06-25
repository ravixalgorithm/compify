/**
 * Horizontal section divider — a single flat gray hairline (uses the `divider`
 * token) shared across the sidebar, variant nav, admin shell and info tabs.
 */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={className ? `shrink-0 w-full ${className}` : "shrink-0 w-full"}
      role="separator"
      aria-hidden
    >
      <div className="h-px w-full bg-divider" />
    </div>
  );
}
