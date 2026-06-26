"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiAddLine, RiArrowDownSLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

// Color selector with two modes:
//  • Solid   — saturation/value square + hue slider + hex field (Figma 2001:843).
//  • Gradient — type (linear/radial) + direction dropdowns, a live gradient bar
//    with draggable stops, and a Stops list (position %, swatch, hex, opacity).
// The HSV square is shared: in gradient mode it edits the selected stop's color.
// Output is a CSS color string — a hex for solid, a `linear/radial-gradient(...)`
// for gradient — so it drops straight into a component's `background`.

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

function hexToRgb(input: string): [number, number, number] {
  let hex = input.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
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

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    "#" +
    [mix(ar, br), mix(ag, bg), mix(ab, bb)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// ---- gradient model ----------------------------------------------------------

type Stop = { color: string; pos: number; opacity: number };
type Gradient = { type: "linear" | "radial"; angle: number; stops: Stop[] };

const DIRECTIONS: { label: string; angle: number }[] = [
  { label: "Left → Right", angle: 90 },
  { label: "Right → Left", angle: 270 },
  { label: "Top → Bottom", angle: 180 },
  { label: "Bottom → Top", angle: 0 },
  { label: "↘ Diagonal", angle: 135 },
  { label: "↙ Diagonal", angle: 225 },
  { label: "↗ Diagonal", angle: 45 },
  { label: "↖ Diagonal", angle: 315 },
];

function snapAngle(a: number): number {
  return (((Math.round(a / 45) * 45) % 360) + 360) % 360;
}

function dirToAngle(dir: string): number {
  const d = dir.replace(/^to\s+/i, "").trim().toLowerCase();
  const map: Record<string, number> = {
    top: 0,
    bottom: 180,
    left: 270,
    right: 90,
    "top right": 45,
    "right top": 45,
    "bottom right": 135,
    "right bottom": 135,
    "bottom left": 225,
    "left bottom": 225,
    "top left": 315,
    "left top": 315,
  };
  return map[d] ?? 90;
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseStopColor(token: string): { color: string; opacity: number } {
  const t = token.trim();
  const rgba = t.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgba) {
    const hex =
      "#" +
      [rgba[1], rgba[2], rgba[3]]
        .map((n) => clamp(Number(n), 0, 255).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    const op = rgba[4] != null ? Math.round(parseFloat(rgba[4]) * 100) : 100;
    return { color: hex, opacity: clamp(op, 0, 100) };
  }
  let hex = t.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8 && /^[0-9a-fA-F]{8}$/.test(hex)) {
    const a = parseInt(hex.slice(6, 8), 16);
    return { color: "#" + hex.slice(0, 6).toUpperCase(), opacity: Math.round((a / 255) * 100) };
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return { color: "#" + hex.toUpperCase(), opacity: 100 };
  return { color: "#FFFFFF", opacity: 100 };
}

function parseGradient(value: string): Gradient | null {
  const v = (value || "").trim();
  const radial = /^radial-gradient\(/i.test(v);
  const linear = /^linear-gradient\(/i.test(v);
  if (!radial && !linear) return null;
  const inner = v.slice(v.indexOf("(") + 1, v.lastIndexOf(")"));
  const parts = splitTopLevel(inner).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  let angle = 90;
  let idx = 0;
  if (linear) {
    const degM = parts[0].match(/^(-?\d+(?:\.\d+)?)deg$/i);
    if (degM) {
      angle = snapAngle(Number(degM[1]));
      idx = 1;
    } else if (/^to\s+/i.test(parts[0])) {
      angle = dirToAngle(parts[0]);
      idx = 1;
    }
  }
  const slice = parts.slice(idx);
  const stops: Stop[] = slice.map((p, i) => {
    const m = p.match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)%)?$/);
    const colorTok = (m?.[1] ?? p).trim();
    const pos = m?.[2] != null ? Number(m[2]) : (i / Math.max(1, slice.length - 1)) * 100;
    const { color, opacity } = parseStopColor(colorTok);
    return { color, pos: clamp(pos, 0, 100), opacity };
  });
  if (stops.length < 2) return null;
  return { type: radial ? "radial" : "linear", angle, stops };
}

/** A hex color, or an `rgba(...)` string when opacity (0-100) is below full. */
function rgbaCss(hex: string, opacity: number): string {
  if (opacity >= 100) return hex;
  const [r, g, b] = hexToRgb(hex);
  const a = Number((clamp(opacity, 0, 100) / 100).toFixed(2));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function stopCss(s: Stop): string {
  return rgbaCss(s.color, s.opacity);
}

function stopList(stops: Stop[]): string {
  return [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${stopCss(s)} ${Math.round(s.pos)}%`)
    .join(", ");
}

function gradientCss(g: Gradient): string {
  const stops = stopList(g.stops);
  if (g.type === "radial") return `radial-gradient(${stops})`;
  return `linear-gradient(${Math.round(g.angle)}deg, ${stops})`;
}

/** Flat left→right preview of the stops for the editor bar (any gradient type). */
function barCss(stops: Stop[]): string {
  return `linear-gradient(90deg, ${stopList(stops)})`;
}

// ---- pointer drag helper -----------------------------------------------------

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

// ---- shared color area: SV square + hue slider + alpha slider ----------------

function ColorArea({
  hex,
  alpha,
  onChange,
}: {
  hex: string;
  /** Opacity 0-100. */
  alpha: number;
  onChange: (hex: string, alpha: number) => void;
}) {
  const [hsv, setHsv] = useState<HSV>(() => parseHex(hex) ?? { h: 215, s: 0.23, v: 0.66 });
  const lastEmitted = useRef<string>(hsvToHex(hsv.h, hsv.s, hsv.v));

  useEffect(() => {
    if (hex.toUpperCase() === lastEmitted.current.toUpperCase()) return;
    const next = parseHex(hex);
    if (next) {
      setHsv(next);
      lastEmitted.current = hsvToHex(next.h, next.s, next.v);
    }
  }, [hex]);

  function commit(next: HSV, nextAlpha = alpha) {
    setHsv(next);
    const h = hsvToHex(next.h, next.s, next.v);
    lastEmitted.current = h;
    onChange(h, nextAlpha);
  }

  const sv = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => commit({ ...hsv, h: x * 360 }));
  const alphaSlider = useDrag((x) => commit(hsv, Math.round(clamp(x, 0, 1) * 100)));
  const hueColor = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="flex flex-col gap-2">
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

      {/* Alpha / opacity slider — transparent→color ramp over a checkerboard */}
      <div
        ref={alphaSlider.ref}
        onPointerDown={alphaSlider.onPointerDown}
        className="relative h-[10px] w-full cursor-pointer touch-none rounded-full"
        style={{
          background: `linear-gradient(to right, transparent, ${currentHex}), repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%) 0 / 8px 8px`,
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${clamp(alpha, 0, 100)}%`, backgroundColor: currentHex }}
          aria-hidden
        />
      </div>
    </div>
  );
}

// ---- dropdown (matches the site's Select; portaled above the picker) ---------

function MiniSelect({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    { top: number; left: number; width: number; side: "top" | "bottom" } | null
  >(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuH = Math.min(240, options.length * 30 + 4);
      const below = r.bottom + 4 + menuH <= window.innerHeight;
      const top = below ? r.bottom + 4 : Math.max(8, r.top - 4 - menuH);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
      setPos({ top, left, width: r.width, side: below ? "top" : "bottom" });
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
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
  }, [open, options.length]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-1 border border-field bg-field py-[5px] pl-2 pr-1.5",
          "font-mono text-xsm text-[#c8c8c8] outline-none transition-[color] duration-micro ease-micro",
          open && "text-white",
        )}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <RiArrowDownSLine
          size={14}
          className={cn(
            "shrink-0 text-[#c8c8c8] transition-transform duration-micro ease-micro",
            open && "-rotate-180",
          )}
        />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              data-tweak-popover
              style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 10000 }}
              className={cn(
                "no-scrollbar max-h-[240px] overflow-y-auto border border-panel-line bg-[#2a2a2c] shadow-[0px_4px_10px_rgba(0,0,0,0.4)]",
                "animate-in fade-in-0 zoom-in-95 duration-150 ease-out",
                pos.side === "top" ? "origin-top slide-in-from-top-2" : "origin-bottom slide-in-from-bottom-2",
              )}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full cursor-pointer truncate px-2 py-[6px] text-left font-mono text-xsm",
                    "transition-[color,background-color] duration-micro ease-micro",
                    o.value === value
                      ? "bg-field font-medium text-white"
                      : "text-[#c8c8c8] hover:bg-field hover:text-white",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ---- main picker -------------------------------------------------------------

export function ColorPicker({
  value,
  onChange,
  onApply,
  caretSide = "top",
  caretLeft = 185,
  allowGradient = true,
  maxHeight,
}: {
  value: string;
  onChange: (value: string) => void;
  onApply?: (value: string) => void;
  /** Which edge the caret sits on (popover below anchor -> "top"). */
  caretSide?: "top" | "bottom";
  /** Caret center, px from the picker's left edge (points at the anchor). */
  caretLeft?: number;
  /** When false, the Gradient tab is hidden — solid colors only. */
  allowGradient?: boolean;
  /** Cap the scrollable body height (px) so the picker fits the available space. */
  maxHeight?: number;
}) {
  const initialGrad = allowGradient ? parseGradient(value) : null;
  const initialParsed = parseStopColor(value);
  const initialSolid = initialGrad ? initialGrad.stops[0].color : initialParsed.color;
  const initialAlpha = initialGrad ? 100 : initialParsed.opacity;

  const [mode, setMode] = useState<"solid" | "gradient">(initialGrad ? "gradient" : "solid");
  const [solidHex, setSolidHex] = useState(initialSolid);
  const [solidAlpha, setSolidAlpha] = useState(initialAlpha);
  const [grad, setGrad] = useState<Gradient>(
    () =>
      initialGrad ?? {
        type: "linear",
        angle: 90,
        stops: [
          { color: initialSolid, pos: 0, opacity: 100 },
          { color: "#000000", pos: 100, opacity: 100 },
        ],
      },
  );
  const [sel, setSel] = useState(0);
  const [solidHexText, setSolidHexText] = useState(initialSolid);

  // Single source of truth for what we last emitted, so an external `value`
  // change re-initializes the picker but our own emits don't echo back.
  const lastEmitted = useRef<string>(value);
  const gradRef = useRef(grad);
  gradRef.current = grad;

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const g = allowGradient ? parseGradient(value) : null;
    if (g) {
      setMode("gradient");
      setGrad(g);
      setSel((s) => Math.min(s, g.stops.length - 1));
    } else {
      setMode("solid");
      const c = parseStopColor(value);
      setSolidHex(c.color);
      setSolidAlpha(c.opacity);
      setSolidHexText(c.color);
    }
    lastEmitted.current = value;
  }, [value, allowGradient]);

  function emit(css: string) {
    lastEmitted.current = css;
    onChange(css);
  }

  function setSolidColor(hex: string, alpha: number) {
    setSolidHex(hex);
    setSolidAlpha(alpha);
    setSolidHexText(hex);
    emit(rgbaCss(hex, alpha));
  }

  function updateGrad(next: Gradient) {
    setGrad(next);
    emit(gradientCss(next));
  }

  function switchMode(next: "solid" | "gradient") {
    if (next === mode) return;
    setMode(next);
    emit(next === "solid" ? rgbaCss(solidHex, solidAlpha) : gradientCss(grad));
  }

  const selIndex = Math.min(sel, grad.stops.length - 1);
  const selStop = grad.stops[selIndex] ?? grad.stops[0];

  function setStopColorAlpha(hex: string, alpha: number) {
    updateGrad({
      ...grad,
      stops: grad.stops.map((s, i) => (i === selIndex ? { ...s, color: hex, opacity: alpha } : s)),
    });
  }

  function patchStop(i: number, patch: Partial<Stop>) {
    updateGrad({ ...grad, stops: grad.stops.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  }

  function addStop() {
    const sorted = grad.stops.map((s, i) => ({ s, i })).sort((a, b) => a.s.pos - b.s.pos);
    let lo = sorted[0];
    let hi = sorted[sorted.length - 1];
    let best = -1;
    for (let k = 0; k < sorted.length - 1; k++) {
      const gap = sorted[k + 1].s.pos - sorted[k].s.pos;
      if (gap > best) {
        best = gap;
        lo = sorted[k];
        hi = sorted[k + 1];
      }
    }
    const pos = (lo.s.pos + hi.s.pos) / 2;
    const newStop: Stop = {
      color: lerpColor(lo.s.color, hi.s.color, 0.5),
      pos,
      opacity: Math.round((lo.s.opacity + hi.s.opacity) / 2),
    };
    const next = [...grad.stops, newStop];
    updateGrad({ ...grad, stops: next });
    setSel(next.length - 1);
  }

  function removeStop(i: number) {
    if (grad.stops.length <= 2) return;
    const next = grad.stops.filter((_, k) => k !== i);
    updateGrad({ ...grad, stops: next });
    setSel((s) => Math.max(0, Math.min(s, next.length - 1)));
  }

  const barRef = useRef<HTMLDivElement>(null);
  function startStopDrag(i: number) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSel(i);
      const move = (ev: PointerEvent) => {
        const el = barRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const pos = clamp((ev.clientX - r.left) / r.width, 0, 1) * 100;
        const g = gradRef.current;
        updateGrad({ ...g, stops: g.stops.map((s, k) => (k === i ? { ...s, pos } : s)) });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const applyValue = mode === "solid" ? rgbaCss(solidHex, solidAlpha) : gradientCss(grad);
  const displayStops = grad.stops.map((s, i) => ({ s, i })).sort((a, b) => a.s.pos - b.s.pos);

  return (
    <div className="relative w-[240px] bg-[#242424] p-1.5 shadow-[0px_8px_24px_rgba(0,0,0,0.45)]">
      {/* caret — points at the anchor (top edge when below, bottom edge when above) */}
      <div
        aria-hidden
        className="absolute size-3 rotate-45 bg-[#242424]"
        style={{ left: caretLeft - 6, ...(caretSide === "top" ? { top: -6 } : { bottom: -6 }) }}
      />

      <div
        className="no-scrollbar flex flex-col gap-[10px] overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: maxHeight != null ? maxHeight : "min(74vh, 560px)" }}
      >
        {/* Solid | Gradient toggle — sliding indicator, matches YesNoControl */}
        {allowGradient ? (
          <div className="relative flex w-full items-stretch bg-[#171717]">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -top-px -bottom-px w-[calc(50%+2px)] border border-field bg-field",
                "transition-[left] duration-micro ease-micro",
                mode === "solid" ? "-left-px" : "left-[calc(50%-1px)]",
              )}
            />
            <button
              type="button"
              onClick={() => switchMode("solid")}
              className={cn(
                "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-xsm ui-micro",
                mode === "solid" ? "text-white" : "text-[#c8c8c8]",
              )}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => switchMode("gradient")}
              className={cn(
                "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-xsm ui-micro",
                mode === "gradient" ? "text-white" : "text-[#c8c8c8]",
              )}
            >
              Gradient
            </button>
          </div>
        ) : null}

        {/* Color area — edits the solid color or the selected gradient stop */}
        <ColorArea
          key={mode === "gradient" ? `g-${selIndex}` : "solid"}
          hex={mode === "solid" ? solidHex : selStop?.color ?? "#FFFFFF"}
          alpha={mode === "solid" ? solidAlpha : selStop?.opacity ?? 100}
          onChange={mode === "solid" ? setSolidColor : setStopColorAlpha}
        />

        {mode === "solid" ? (
          <div className="flex gap-1.5">
            <input
              value={solidHexText}
              onChange={(e) => {
                const text = e.target.value;
                setSolidHexText(text);
                if (parseHex(text)) {
                  setSolidColor(parseStopColor("#" + text.replace(/^#/, "")).color, solidAlpha);
                }
              }}
              spellCheck={false}
              className="min-w-0 flex-1 bg-[#111] px-2.5 py-1.5 font-mono text-xsm uppercase tracking-[-0.42px] text-white outline-none"
              aria-label="Hex color"
            />
            <div className="flex w-[62px] shrink-0 items-center bg-[#111]">
              <input
                value={Math.round(solidAlpha)}
                onChange={(e) => setSolidColor(solidHex, clamp(Number(e.target.value) || 0, 0, 100))}
                inputMode="numeric"
                aria-label="Opacity"
                className="w-full min-w-0 bg-transparent py-1.5 pl-2.5 pr-0.5 font-mono text-xsm text-white outline-none"
              />
              <span className="pr-2 text-2xs text-[#7a7a7a]">%</span>
            </div>
          </div>
        ) : (
          <>
            {/* Type + direction dropdowns */}
            <div className="flex gap-1.5">
              <MiniSelect
                ariaLabel="Gradient type"
                className={grad.type === "linear" ? "w-[96px] shrink-0" : "flex-1"}
                value={grad.type}
                onChange={(v) => updateGrad({ ...grad, type: v as Gradient["type"] })}
                options={[
                  { value: "linear", label: "Linear" },
                  { value: "radial", label: "Radial" },
                ]}
              />
              {grad.type === "linear" ? (
                <MiniSelect
                  ariaLabel="Gradient direction"
                  className="min-w-0 flex-1"
                  value={String(snapAngle(grad.angle))}
                  onChange={(v) => updateGrad({ ...grad, angle: Number(v) })}
                  options={DIRECTIONS.map((d) => ({ value: String(d.angle), label: d.label }))}
                />
              ) : null}
            </div>

            {/* Gradient bar with draggable stops (always shown left→right by pos) */}
            <div
              ref={barRef}
              className="relative h-[20px] w-full rounded-[3px]"
              style={{
                background: `${barCss(grad.stops)}, repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%) 0 / 12px 12px`,
              }}
            >
              {grad.stops.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onPointerDown={startStopDrag(i)}
                  onClick={() => setSel(i)}
                  aria-label={`Stop ${i + 1}`}
                  className={cn(
                    "absolute top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] active:cursor-grabbing",
                    i === selIndex ? "border-white" : "border-white/70",
                  )}
                  style={{ left: `${s.pos}%`, backgroundColor: s.color }}
                />
              ))}
            </div>

            {/* Stops header */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#9a9a9a]">Stops</span>
              <button
                type="button"
                onClick={addStop}
                aria-label="Add stop"
                className="flex size-[20px] items-center justify-center text-[#c8c8c8] transition-colors hover:bg-field hover:text-white"
              >
                <RiAddLine size={14} />
              </button>
            </div>

            {/* Stop rows */}
            <div className="no-scrollbar flex max-h-[148px] flex-col gap-1 overflow-y-auto overflow-x-hidden">
              {displayStops.map(({ s, i }) => (
                <div
                  key={i}
                  onPointerDown={() => setSel(i)}
                  className={cn(
                    "flex items-center gap-1 px-1 py-1",
                    i === selIndex ? "bg-[#2f2f33]" : "bg-[#1b1b1b]",
                  )}
                >
                  {/* position % */}
                  <div className="flex w-[44px] shrink-0 items-center bg-[#111]">
                    <input
                      value={Math.round(s.pos)}
                      onChange={(e) =>
                        patchStop(i, { pos: clamp(Number(e.target.value) || 0, 0, 100) })
                      }
                      inputMode="numeric"
                      aria-label="Stop position"
                      className="w-full bg-transparent px-1.5 py-1 font-mono text-[11px] text-[#c8c8c8] outline-none"
                    />
                    <span className="pr-1 text-[10px] text-[#7a7a7a]">%</span>
                  </div>
                  {/* swatch */}
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    aria-label="Select stop color"
                    className={cn(
                      "size-[16px] shrink-0 rounded-[3px]",
                      i === selIndex ? "ring-1 ring-white" : "ring-1 ring-white/20",
                    )}
                    style={{ backgroundColor: s.color }}
                  />
                  {/* hex */}
                  <input
                    value={s.color.replace(/^#/, "")}
                    onChange={(e) => {
                      const parsed = parseHex(e.target.value);
                      if (parsed) patchStop(i, { color: parseStopColor("#" + e.target.value.replace(/^#/, "")).color });
                    }}
                    spellCheck={false}
                    aria-label="Stop hex"
                    className="min-w-0 flex-1 bg-[#111] px-1.5 py-1 font-mono text-[11px] uppercase text-[#c8c8c8] outline-none"
                  />
                  {/* opacity % */}
                  <div className="flex w-[46px] shrink-0 items-center bg-[#111]">
                    <input
                      value={Math.round(s.opacity)}
                      onChange={(e) =>
                        patchStop(i, { opacity: clamp(Number(e.target.value) || 0, 0, 100) })
                      }
                      inputMode="numeric"
                      aria-label="Stop opacity"
                      className="w-full bg-transparent px-1.5 py-1 font-mono text-[11px] text-[#c8c8c8] outline-none"
                    />
                    <span className="pr-1 text-[10px] text-[#7a7a7a]">%</span>
                  </div>
                  {/* remove */}
                  <button
                    type="button"
                    onClick={() => removeStop(i)}
                    disabled={grad.stops.length <= 2}
                    aria-label="Remove stop"
                    className="flex size-[18px] shrink-0 items-center justify-center text-[#9a9a9a] transition-colors enabled:hover:text-white disabled:opacity-30"
                  >
                    <RiSubtractLine size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Apply */}
        <button
          type="button"
          onClick={() => onApply?.(applyValue)}
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
