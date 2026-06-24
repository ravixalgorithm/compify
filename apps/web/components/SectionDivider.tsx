/**
 * Figma 133:1284 — horizontal section divider.
 * Semi-transparent gray band + #020202 bottom hairline (not a flat black border).
 */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={className ? `shrink-0 w-full ${className}` : "shrink-0 w-full"}
      role="separator"
      aria-hidden
    >
      <div className="h-px w-full bg-[rgba(43,43,43,0.5)]" />
      <div className="h-[1.25px] w-full bg-[#020202]" />
    </div>
  );
}
