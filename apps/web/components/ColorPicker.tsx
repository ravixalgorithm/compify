"use client";

import { useEffect, useRef, useState } from "react";

// Custom color selector (Figma node 2001:843): saturation/value square with a
// cursor, a rainbow hue slider with a handle, an editable hex field, and an
// Apply button — in a dark popover panel with a top caret. Functional HSV math
// + pointer drag (the Figma reference used static gradient images).

type HSV = { h: number; s: number; v: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parseHex(input: string): HSV | null {
  let hex = input.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return rgbToHsv(r, g, b);
}

/** Track pointer drag over an element, reporting normalized x/y in [0,1]. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const handle = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onMoveRef.current(clamp((clientX - r.left) / r.width, 0, 1), clamp((clientY - r.top) / r.height, 0, 1));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handle(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => handle(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return { ref, onPointerDown };
}

export function ColorPicker({
  value,
  onChange,
  onApply,
  caretSide = "top",
  caretLeft = 185,
}: {
  value: string;
  onChange: (hex: string) => void;
  onApply?: (hex: string) => void;
  /** Which edge the caret sits on (popover below anchor -> "top"). */
  caretSide?: "top" | "bottom";
  /** Caret center, px from the picker's left edge (points at the anchor). */
  caretLeft?: number;
}) {
  const [hsv, setHsv] = useState<HSV>(() => parseHex(value) ?? { h: 215, s: 0.23, v: 0.66 });
  const [hexText, setHexText] = useState(() => hsvToHex(hsv.h, hsv.s, hsv.v));

  // Re-sync from an external value change (e.g. another control set the color),
  // but ignore echoes of our own emitted hex.
  const lastEmitted = useRef<string>(hexText);
  useEffect(() => {
    if (value.toUpperCase() === lastEmitted.current.toUpperCase()) return;
    const next = parseHex(value);
    if (next) {
      setHsv(next);
      setHexText(hsvToHex(next.h, next.s, next.v));
    }
  }, [value]);

  function commit(next: HSV) {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexText(hex);
    lastEmitted.current = hex;
    onChange(hex);
  }

  const sv = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => commit({ ...hsv, h: x * 360 }));

  const hueColor = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="relative w-[225px] bg-[#242424] p-1.5 shadow-[0px_8px_24px_rgba(0,0,0,0.45)]">
      {/* caret — points at the anchor (top edge when below, bottom edge when above) */}
      <div
        aria-hidden
        className="absolute size-3 rotate-45 bg-[#242424]"
        style={{ left: caretLeft - 6, ...(caretSide === "top" ? { top: -6 } : { bottom: -6 }) }}
      />

      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-1.5">
          {/* Saturation / Value square */}
          <div
            ref={sv.ref}
            onPointerDown={sv.onPointerDown}
            className="relative h-[110px] w-full cursor-crosshair touch-none overflow-hidden"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
            }}
          >
            <span
              className="pointer-events-none absolute size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: currentHex }}
              aria-hidden
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hue.ref}
            onPointerDown={hue.onPointerDown}
            className="relative h-[10px] w-full cursor-pointer touch-none rounded-full"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
              aria-hidden
            />
          </div>
        </div>

        {/* Hex input */}
        <input
          value={hexText}
          onChange={(e) => {
            const text = e.target.value;
            setHexText(text);
            const next = parseHex(text);
            if (next) {
              setHsv(next);
              lastEmitted.current = hsvToHex(next.h, next.s, next.v);
              onChange(hsvToHex(next.h, next.s, next.v));
            }
          }}
          spellCheck={false}
          className="w-full bg-[#111] px-3 py-1.5 font-mono text-sm tracking-[-0.42px] text-white outline-none"
          aria-label="Hex color"
        />

        {/* Apply */}
        <button
          type="button"
          onClick={() => onApply?.(currentHex)}
          className="relative flex w-full items-center justify-center overflow-hidden bg-white px-3 py-1.5 text-sm tracking-[-0.42px] text-black shadow-[0px_4px_4px_-3px_rgba(178,178,189,0.1),0px_2px_4px_0px_rgba(1,1,1,0.15),0px_0px_1.1px_0px_rgba(0,0,0,0.25)] transition hover:bg-white/90"
        >
          Apply
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-[inset_0px_4px_4px_0px_rgba(255,255,255,0.1)]"
          />
        </button>
      </div>
    </div>
  );
}
