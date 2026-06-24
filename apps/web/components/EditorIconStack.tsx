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

/** Overlapping editor marks for the shared MCP copy button. */
export function EditorIconStack() {
  return (
    <span className="flex items-center pl-0.5" aria-hidden>
      {STACK_ORDER.map((editor, i) => (
        <span
          key={editor}
          className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-stroke ring-2 ring-bg"
          style={{
            marginLeft: i === 0 ? 0 : -6,
            zIndex: STACK_ORDER.length - i,
          }}
        >
          <Image
            src={EDITOR_BRAND_ICONS[editor]}
            alt=""
            width={20}
            height={20}
            className="h-full w-full object-cover"
          />
        </span>
      ))}
    </span>
  );
}
