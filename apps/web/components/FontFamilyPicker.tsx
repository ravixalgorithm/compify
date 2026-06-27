"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { GOOGLE_FONTS, ensureFontLoaded } from "@/lib/fonts";

// Searchable Google-fonts picker. Offers the curated list for search but also
// accepts free text, so any Google family works. Selecting (or hovering) a
// family loads it on demand so the field + preview render in that face — the
// same behaviour as Framer's font control. The dropdown is portaled to <body>
// (fixed) so the tweak panel's scroll container can't clip it.

export function FontFamilyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (family: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Load the current value so the field renders in its own face.
  useEffect(() => {
    ensureFontLoaded(value);
  }, [value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q)) : GOOGLE_FONTS;
    return list.slice(0, 80);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Align to the field and clamp within the control-panel column so the list
      // never spills outside the panel boundary.
      const panel = (el.closest("[data-tweak-panel]") as HTMLElement | null)?.getBoundingClientRect();
      let left = r.left;
      if (panel) left = Math.min(Math.max(left, panel.left + 8), panel.right - r.width - 8);
      setPos({ top: r.bottom + 4, left, width: r.width });
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function select(family: string) {
    const fam = family.trim();
    if (!fam) return;
    onChange(fam);
    ensureFontLoaded(fam);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={anchorRef} className="relative w-full">
      <input
        type="text"
        value={open ? query : value}
        placeholder={value || "Inter"}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            select(query.trim() || results[0] || value);
          }
        }}
        className="w-full border border-field bg-field py-[4px] pl-2 pr-6 font-mono text-sm leading-tight text-[#c8c8c8] outline-none ui-micro"
      />
      <RiArrowDownSLine
        size={16}
        className={cn(
          "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#c8c8c8] duration-micro ease-micro transition-transform",
          open && "-rotate-180",
        )}
      />
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              data-tweak-popover
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
              className="no-scrollbar max-h-[240px] origin-top animate-in overflow-y-auto border border-panel-line bg-[#2a2a2c] fade-in-0 zoom-in-95 duration-150 ease-out slide-in-from-top-2"
            >
              {results.length ? (
                results.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onMouseEnter={() => ensureFontLoaded(f)}
                    onClick={() => select(f)}
                    style={{ fontFamily: `'${f}'` }}
                    className={cn(
                      "block w-full cursor-pointer px-2 py-[6px] text-left text-sm text-[#c8c8c8] transition-[color,background-color] duration-micro ease-micro hover:bg-field hover:text-white",
                      f === value && "font-medium text-white",
                    )}
                  >
                    {f}
                  </button>
                ))
              ) : query.trim() ? (
                <button
                  type="button"
                  onClick={() => select(query.trim())}
                  className="block w-full cursor-pointer px-2 py-[6px] text-left font-mono text-sm text-muted transition-[color,background-color] duration-micro ease-micro hover:bg-field hover:text-white"
                >
                  Use “{query.trim()}”
                </button>
              ) : (
                <p className="px-2 py-[6px] font-mono text-sm text-muted">No matches</p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
