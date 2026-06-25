/** Claude, Cursor, and Codex brand marks for MCP UI. */

import Image from "next/image";
import type { Editor } from "@/lib/prompt";
import { cn } from "@/lib/cn";

export const EDITOR_BRAND_ICONS: Record<Editor, string> = {
  claude: "/brand/icons/claude.png",
  codex: "/brand/icons/codex.png",
  cursor: "/brand/icons/cursor.png",
};

const STACK_ORDER: Editor[] = ["claude", "cursor", "codex"];

export function EditorTabIcon({
  editor,
  className,
}: {
  editor: Editor;
  className?: string;
}) {
  return (
    <Image
      src={EDITOR_BRAND_ICONS[editor]}
      alt=""
      width={20}
      height={20}
      className={cn("h-5 w-5 shrink-0 rounded-[4px] object-contain", className)}
      aria-hidden
    />
  );
}

/**
 * Overlapping editor marks. The brand PNGs are transparent, full-bleed marks
 * (Claude orange; Cursor/Codex white), so each sits on a dark disc with padding
 * (object-contain) and a ring separates the overlap.
 */
export function EditorIconStack({
  size = 20,
  overlap = 6,
  discClassName = "bg-[#2b2b2b]",
  ringClassName = "ring-2 ring-bg",
}: {
  /** Diameter of each circle in px. */
  size?: number;
  /** How many px each circle overlaps the previous one. */
  overlap?: number;
  /** Disc background behind each mark. */
  discClassName?: string;
  /** Ring/border treatment around each circle (e.g. solid white). */
  ringClassName?: string;
} = {}) {
  return (
    <span className="flex items-center" aria-hidden>
      {STACK_ORDER.map((editor, i) => (
        <span
          key={editor}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full",
            discClassName,
            ringClassName,
          )}
          style={{
            height: size,
            width: size,
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: STACK_ORDER.length - i,
          }}
        >
          <Image
            src={EDITOR_BRAND_ICONS[editor]}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-contain"
            style={{ padding: Math.round(size * 0.2) }}
          />
        </span>
      ))}
    </span>
  );
}
