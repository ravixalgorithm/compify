"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiBracesLine,
  RiCheckLine,
  RiCloseLine,
  RiDraggable,
  RiFileCopyLine,
  RiSpeedLine,
  RiSubtractLine,
  RiUpload2Line,
} from "@remixicon/react";
import type { TweakControl, TweakObject, TweakState, TweakValue } from "@compify/shared";
import { isTweakableControl, defaultArrayRow } from "@compify/shared";
import { cn } from "@/lib/cn";
import { FontFamilyPicker } from "@/components/FontFamilyPicker";
import { collapseVariants, microTransition } from "@/lib/motion";
import * as Select from "@/components/ui/select";
import { ColorPicker } from "@/components/ColorPicker";

function controlGroup(control: TweakControl): string {
  if (control.group) return control.group;
  if (control.type === "color") return "Colors";
  if (control.type === "font" || control.type === "richtext") return "Typography";
  if (control.type === "transition") return "Animation";
  if (
    control.type === "number" &&
    /speed|float|rotation|animation|duration|transition|stiffness|damping|delay/i.test(
      control.label,
    )
  ) {
    return "Animation";
  }
  if (
    control.type === "number" ||
    control.type === "padding" ||
    control.type === "borderradius" ||
    control.type === "border" ||
    control.type === "boxshadow"
  ) {
    return "Layout";
  }
  if (
    control.type === "image" ||
    control.type === "responsiveimage" ||
    control.type === "file" ||
    control.type === "link"
  ) {
    return "Content";
  }
  return "Random";
}

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-[125px] shrink-0 text-sm tracking-[-0.42px] text-muted">
      {children}
    </span>
  );
}

function ControlRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-[6px] px-[14px] py-[8px]",
        className
      )}
    >
      <ControlLabel>{label}</ControlLabel>
      <div className="flex min-w-0 flex-1 items-center overflow-visible">{children}</div>
    </div>
  );
}

function ValueBox({
  value,
  onChange,
  className,
}: {
  value: string | number;
  onChange?: (v: string) => void;
  className?: string;
}) {
  if (onChange) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-[40px] shrink-0 border border-field bg-field px-[6px] py-[4px] text-center font-mono text-2xs text-[#c8c8c8] outline-none",
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex w-[40px] shrink-0 items-start justify-center border border-field bg-field px-[6px] py-[4px]",
        className
      )}
    >
      <span className="font-mono text-2xs text-[#c8c8c8]">{value}</span>
    </div>
  );
}

function FigmaSlider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-1 items-center gap-[12px]">
      <div className="relative h-[12px] min-w-0 flex-1">
        <div className="absolute left-0 right-0 top-[calc(50%+1px)] h-[4px] -translate-y-1/2 bg-track" />
        <div
          className="absolute left-0 top-[calc(50%+1px)] h-[4px] -translate-y-1/2 bg-white transition-[width] duration-micro ease-micro"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute top-[3px] size-[8px] bg-white transition-[left] duration-micro ease-micro"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
      <ValueBox
        value={value}
        onChange={(raw) => {
          const next = Number(raw);
          if (!Number.isNaN(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
      />
    </div>
  );
}

function ColorControl({
  value,
  onChange,
  controlKey,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Schema key — used to look up whether gradients render for this prop. */
  controlKey?: string;
}) {
  const gradientSupport = useContext(GradientSupportContext);
  const allowGradient = controlKey != null && (gradientSupport?.has(controlKey) ?? false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    {
      top?: number;
      bottom?: number;
      left: number;
      caretSide: "top" | "bottom";
      caretLeft: number;
      maxHeight: number;
    } | null
  >(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // The picker is rendered in a portal (fixed position) so the tweak panel's
  // overflow-hidden scroll container can't clip it. It anchors the edge nearest
  // the swatch — top below it, or BOTTOM above it (so a short picker sits right
  // by the swatch instead of pinning to a far-up estimate) — and closes when the
  // swatch scrolls out of the panel, with the caret pointing at it.
  useEffect(() => {
    if (!open) return;
    const PICKER_W = 240;
    const GAP = 4;
    const place = () => {
      const el = swatchRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const panel = (el.closest("[data-tweak-panel]") as HTMLElement | null)?.getBoundingClientRect();
      // Close once the swatch scrolls out of the panel's visible area instead of
      // leaving the picker floating detached.
      if (panel && (r.bottom <= panel.top + 2 || r.top >= panel.bottom - 2)) {
        setOpen(false);
        return;
      }
      const center = r.left + r.width / 2;
      const left = Math.max(8, Math.min(center - PICKER_W / 2, window.innerWidth - PICKER_W - 8));
      const caretLeft = Math.max(12, Math.min(center - left, PICKER_W - 12));
      const belowSpace = window.innerHeight - r.bottom - GAP - 8;
      const aboveSpace = r.top - GAP - 8;
      const below = belowSpace >= 330 || belowSpace >= aboveSpace;
      const maxHeight = Math.min(Math.max(below ? belowSpace : aboveSpace, 200), Math.round(window.innerHeight * 0.85));
      if (below) {
        setPos({ top: r.bottom + GAP, left, caretSide: "top", caretLeft, maxHeight });
      } else {
        setPos({ bottom: window.innerHeight - r.top + GAP, left, caretSide: "bottom", caretLeft, maxHeight });
      }
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popRef.current?.contains(t)) return;
      // The picker's own dropdowns (type/direction) portal to <body>, outside
      // popRef — don't treat clicks inside them as "outside" the picker.
      if ((t as HTMLElement).closest?.("[data-tweak-popover]")) return;
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

  return (
    <div ref={anchorRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <button
        ref={swatchRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative size-[18px] shrink-0"
        aria-label="Open color picker"
        aria-expanded={open}
      >
        <span className="block size-full" style={{ background: value }} aria-hidden />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-0 flex-1 border border-field bg-field py-[4px] pl-2 pr-2 font-mono text-xsm uppercase text-[#c8c8c8] outline-none"
      />
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              data-tweak-popover
              style={{ position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
              className={cn(
                "animate-in fade-in-0 zoom-in-95 duration-150 ease-out",
                pos.caretSide === "top"
                  ? "origin-top slide-in-from-top-2"
                  : "origin-bottom slide-in-from-bottom-2",
              )}
            >
              <ColorPicker
                value={value}
                onChange={onChange}
                onApply={(next) => {
                  onChange(next);
                  setOpen(false);
                }}
                caretSide={pos.caretSide}
                caretLeft={pos.caretLeft}
                allowGradient={allowGradient}
                maxHeight={pos.maxHeight}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** True for values that look like an image/asset URL or path worth copying. */
function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return (
    /^(https?:)?\/\//i.test(v) ||
    v.startsWith("/") ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(v)
  );
}

function TextControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const showCopy = looksLikeUrl(value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full border border-field bg-field py-[4px] pl-[6px] font-mono text-xsm text-[#c8c8c8] outline-none ui-micro",
          showCopy ? "pr-[26px]" : "pr-[3px]",
        )}
      />
      {showCopy ? (
        <button
          type="button"
          onClick={copy}
          aria-label="Copy URL"
          className="ui-press absolute right-[5px] top-1/2 flex -translate-y-1/2 items-center text-[#888] hover:text-white"
        >
          {copied ? <RiCheckLine size={14} /> : <RiFileCopyLine size={14} />}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Number field with a hidden native spinner and clean chevron up/down steppers
 * (▲/▼) on the right. Shared by NumberFieldControl and MiniNumber.
 */
function StepperInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  small?: boolean;
}) {
  const clamp = (n: number) => {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };
  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    onChange(clamp(Math.round((base + dir * step) * 1e4) / 1e4));
  };

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Latest bump (the wheel listener is attached once but must use current value).
  const bumpRef = useRef(bump);
  bumpRef.current = bump;

  // Scroll over the field to inc/dec — but only while it's focused, like a native
  // number input. A native, non-passive listener so we can stopPropagation past
  // the panel's wheel-trap (and preventDefault the page scroll).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== inputRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      bumpRef.current(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag the value horizontally to scrub it (Framer-style). A small threshold
  // distinguishes a scrub from a plain click (which still focuses for typing).
  const [scrubbing, setScrubbing] = useState(false);
  const dragRef = useRef<{ x: number; val: number; active: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, val: Number.isFinite(value) ? value : 0, active: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.active) {
      if (Math.abs(dx) < 3) return;
      d.active = true;
      setScrubbing(true);
      inputRef.current?.setPointerCapture(e.pointerId);
      inputRef.current?.blur();
    }
    e.preventDefault();
    onChange(clamp(Math.round((d.val + Math.round(dx / 2) * step) * 1e4) / 1e4));
  };
  const endDrag = (e: React.PointerEvent<HTMLInputElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.active) {
      try {
        inputRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setScrubbing(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="ui-micro flex w-full items-stretch border border-field bg-field transition-colors focus-within:border-[#5a5a5c] focus-within:bg-[#2a2a2b]"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Decrease"
        onClick={() => bump(-1)}
        className="ui-press flex shrink-0 items-center justify-center border-r border-[#2e2e2e] px-[8px] text-muted transition hover:text-white"
      >
        <RiSubtractLine size={13} />
      </button>
      <input
        ref={inputRef}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(clamp(next));
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onFocus={(e) => {
          // Select the whole value on focus so a click lets you type a new number
          // straight away. Deferred past the click's caret placement, and skipped
          // when a drag-scrub took focus (it blurs the input).
          const el = e.currentTarget;
          requestAnimationFrame(() => {
            if (document.activeElement === el) el.select();
          });
        }}
        className={cn(
          "min-w-0 flex-1 cursor-ew-resize bg-transparent px-[6px] py-[4px] text-center font-mono text-[#c8c8c8] outline-none focus:text-white",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          scrubbing && "select-none",
          small ? "text-xsm" : "text-sm",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Increase"
        onClick={() => bump(1)}
        className="ui-press flex shrink-0 items-center justify-center border-l border-[#2e2e2e] px-[8px] text-muted transition hover:text-white"
      >
        <RiAddLine size={13} />
      </button>
    </div>
  );
}

function NumberFieldControl({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return <StepperInput value={value} onChange={onChange} min={min} max={max} step={step} />;
}

function numberSliderMax(control: TweakControl, value: number): number {
  const baseline =
    typeof control.default === "number" ? control.default : 0;
  return control.max ?? Math.max(100, baseline, value);
}

function useNumberField(control: TweakControl, value: number): boolean {
  if (/^(width|height)$/i.test(control.key)) return true;
  if (control.max != null) return false;
  const baseline =
    typeof control.default === "number" ? control.default : 0;
  return Math.max(baseline, value) > 100;
}

function SelectControl({
  value,
  options,
  onChange,
  optionTitles,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  /** Friendly display labels parallel to `options` (e.g. "Ease In Out"). */
  optionTitles?: string[];
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label="Select option">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {options.map((opt, i) => (
          <Select.Item key={opt} value={opt}>
            {optionTitles?.[i] ?? opt}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function YesNoControl({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="relative flex w-full items-stretch bg-[#171717]">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-px -bottom-px w-[calc(50%+2px)] border border-field bg-field",
          "transition-[left] duration-micro ease-micro",
          value ? "-left-px" : "left-[calc(50%-1px)]",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-xsm ui-micro",
          value ? "text-white" : "text-[#c8c8c8]",
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-xsm ui-micro",
          !value ? "text-white" : "text-[#c8c8c8]",
        )}
      >
        No
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  bordered,
  collapsed,
  onToggle,
}: {
  title: string;
  bordered: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-8 w-full items-center gap-2 px-[14px] py-2 ui-micro",
        bordered && "border-t border-panel-line",
      )}
    >
      <RiArrowDownSLine
        size={10}
        className={cn(
          "shrink-0 text-white transition-transform duration-micro ease-micro",
          collapsed && "-rotate-90"
        )}
      />
      <span className="text-xs uppercase tracking-[-0.24px] text-white">
        {title}
      </span>
    </button>
  );
}

// ---- helpers for object/array-valued controls ----

function asObject(v: TweakValue | undefined): TweakObject {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as TweakObject) : {};
}

function asArray(v: TweakValue | undefined): TweakValue[] {
  return Array.isArray(v) ? v : [];
}

/** Top-level tweak state, so nested controls can evaluate `hidden(props, root)`
 *  against the root props (a sub-control keyed off a top-level value). */
const RootStateContext = createContext<Record<string, unknown>>({});

// Set of color-control keys that actually render a gradient on this component
// (determined by a runtime probe). null = unknown/not probed → gradients hidden.
// Lets a color control show the Gradient tab only where it would take effect.
const GradientSupportContext = createContext<Set<string> | null>(null);

/**
 * A control is shown when it's editable and Framer's `hidden` predicate (if any)
 * is false. `scope` is the local props (full state for top-level controls, the
 * object value for object fields, the row for array items); `root` is the full
 * top-level state. Passing both matches Framer's `hidden(props, root)` signature
 * — nested controls often key off the root (e.g. a sub-direction that depends on
 * a top-level orientation).
 */
function controlVisible(
  control: TweakControl,
  scope: Record<string, unknown>,
  root: Record<string, unknown>,
): boolean {
  if (!isTweakableControl(control)) return false;
  if (control.hiddenWhen) {
    try {
      if (control.hiddenWhen(scope, root)) return false;
    } catch {
      /* predicate referenced a missing prop — fall through to visible */
    }
  }
  return true;
}

const CURSORS = [
  "auto",
  "default",
  "pointer",
  "grab",
  "grabbing",
  "crosshair",
  "text",
  "move",
  "not-allowed",
  "wait",
  "help",
  "none",
];

// Friendly labels for enum option values when the component didn't supply
// `optionTitles` — common direction abbreviations, then camelCase/kebab → Title.
const OPTION_LABELS: Record<string, string> = {
  ltr: "Left to Right",
  rtl: "Right to Left",
  ttb: "Top to Bottom",
  btt: "Bottom to Top",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

function humanizeOption(value: string): string {
  const key = value.toLowerCase();
  if (OPTION_LABELS[key]) return OPTION_LABELS[key];
  return value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// framer-motion named easings for the Transition control's Ease dropdown.
const EASE_VALUES = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "circIn",
  "circOut",
  "circInOut",
  "backIn",
  "backOut",
  "backInOut",
  "anticipate",
];
const EASE_LABELS = EASE_VALUES.map(humanizeOption);

/** Block-rendered controls span the full panel width with the label on top. */
const BLOCK_TYPES = new Set<TweakControl["type"]>([
  "padding",
  "borderradius",
  "border",
  "responsiveimage",
  "richtext",
  "object",
  "array",
]);

/** A compact labelled field used inside font/transition/object/array editors. */
function SubField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[6px] py-[3px]">
      <span className="w-[84px] shrink-0 text-sm tracking-[-0.24px] text-muted">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}

function MiniText({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-field bg-field py-[4px] pl-[6px] pr-[3px] font-mono text-2xs text-[#c8c8c8] outline-none ui-micro"
    />
  );
}

function MiniNumber({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return <StepperInput value={value} onChange={onChange} step={step} small />;
}

// ---- typography ----

const FONT_WEIGHTS: { value: string; label: string }[] = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];
const FONT_WEIGHT_VALUES = FONT_WEIGHTS.map((w) => w.value);
const FONT_WEIGHT_LABELS = FONT_WEIGHTS.map((w) => w.label);

/** Map a Framer weight name ("Medium", "Semibold", …) to a numeric CSS weight. */
function variantToWeight(variant: string): string | undefined {
  const map: Record<string, string> = {
    thin: "100", hairline: "100",
    extralight: "200", ultralight: "200",
    light: "300",
    regular: "400", normal: "400", book: "400",
    medium: "500",
    semibold: "600", demibold: "600",
    bold: "700",
    extrabold: "800", ultrabold: "800",
    black: "900", heavy: "900",
  };
  return map[variant.toLowerCase().replace(/\s+/g, "")];
}

// Length-with-unit fields (font size / line height / letter spacing): a number
// input + a unit dropdown. Defaults to px when a value has no unit.
const SIZE_UNITS = ["px", "em", "rem", "%"];

function SizeWithUnit({
  value,
  onChange,
  placeholder,
}: {
  value: TweakValue;
  onChange: (v: TweakValue) => void;
  placeholder?: string;
}) {
  const raw = value == null ? "" : String(value);
  const match = raw.trim().match(/^(-?[\d.]*)\s*([a-z%]*)$/i);
  const num = match ? match[1] : raw;
  const unit = (match && match[2]) || "px";
  const compose = (n: string, u: string): TweakValue => (!n ? "" : `${n}${u}`);

  return (
    <div className="flex w-full items-center gap-[6px]">
      <input
        type="text"
        inputMode="decimal"
        value={num}
        placeholder={placeholder}
        onChange={(e) => onChange(compose(e.target.value.trim(), unit))}
        className="min-w-0 flex-1 border border-field bg-field py-[4px] pl-[6px] pr-[3px] font-mono text-xsm text-[#c8c8c8] outline-none ui-micro"
      />
      <div className="w-[62px] shrink-0">
        <SelectControl value={unit} options={SIZE_UNITS} onChange={(u) => onChange(compose(num, u))} />
      </div>
    </div>
  );
}

/**
 * Renders the `font` object as a flat set of normal control rows (Font family /
 * weight / size / line height / letter spacing / text align) — no parent "Font"
 * card. ControlField returns this fragment directly so each row reads like any
 * other prop.
 */
function FontControl({
  value,
  onChange,
}: {
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const v = asObject(value);
  const set = (key: string, val: TweakValue) => onChange({ ...v, [key]: val });
  const text = (key: string) => (v[key] == null ? "" : String(v[key]));

  const weight =
    typeof v.fontWeight === "number"
      ? String(v.fontWeight)
      : typeof v.fontWeight === "string" && /^\d+$/.test(v.fontWeight)
        ? v.fontWeight
        : typeof v.variant === "string"
          ? variantToWeight(v.variant) ?? "400"
          : "400";
  const setWeight = (val: string) => {
    const label = FONT_WEIGHTS.find((w) => w.value === val)?.label ?? "Regular";
    onChange({ ...v, fontWeight: Number(val), variant: label });
  };

  return (
    <>
      <ControlRow label="Font family">
        <FontFamilyPicker value={text("fontFamily")} onChange={(family) => set("fontFamily", family)} />
      </ControlRow>
      <ControlRow label="Font weight">
        <SelectControl
          value={weight}
          options={FONT_WEIGHT_VALUES}
          optionTitles={FONT_WEIGHT_LABELS}
          onChange={setWeight}
        />
      </ControlRow>
      <ControlRow label="Font size">
        <SizeWithUnit value={v.fontSize} onChange={(x) => set("fontSize", x)} placeholder="16" />
      </ControlRow>
      <ControlRow label="Line height">
        <SizeWithUnit value={v.lineHeight} onChange={(x) => set("lineHeight", x)} placeholder="1.5" />
      </ControlRow>
      <ControlRow label="Letter spacing">
        <SizeWithUnit value={v.letterSpacing} onChange={(x) => set("letterSpacing", x)} placeholder="0" />
      </ControlRow>
      <ControlRow label="Text align">
        <SelectControl
          value={text("textAlign") || "left"}
          options={["left", "center", "right", "justify"]}
          optionTitles={["Left", "Center", "Right", "Justify"]}
          onChange={(x) => set("textAlign", x)}
        />
      </ControlRow>
    </>
  );
}

// ---- transition ----

function TransitionControl({
  value,
  onChange,
}: {
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const v = asObject(value);
  const set = (key: string, val: TweakValue) => onChange({ ...v, [key]: val });
  const kind = String(v.type ?? "spring");
  const numAt = (key: string, fallback: number) =>
    typeof v[key] === "number" ? (v[key] as number) : fallback;
  // Ease can be a named string or a cubic-bezier array; the dropdown drives the
  // named set and leaves an existing array value alone until a name is picked.
  const easeValue = typeof v.ease === "string" ? v.ease : "easeInOut";

  const detail =
    kind === "tween" ? humanizeOption(easeValue) : kind === "spring" ? String(numAt("stiffness", 800)) : "";
  const summary = detail ? `${humanizeOption(kind)} · ${detail}` : humanizeOption(kind);

  return (
    <div className="w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ui-micro flex w-full items-center gap-2 border border-field bg-field px-[8px] py-[5px] text-xsm text-[#c8c8c8] transition hover:text-white"
      >
        <RiSpeedLine size={14} className="shrink-0 text-muted" />
        <span className="truncate">{summary}</span>
      </button>
      {open ? (
        <AnchoredPopover anchorRef={btnRef} title="Transition" width={300} onClose={() => setOpen(false)}>
          <div className="flex flex-col p-3">
            <SubField label="Type">
              <SelectControl
                value={kind}
                options={["spring", "tween", "inertia"]}
                optionTitles={["Spring", "Tween", "Inertia"]}
                onChange={(x) => set("type", x)}
              />
            </SubField>
            {kind === "spring" ? (
              <>
                <SubField label="Stiffness">
                  <MiniNumber value={numAt("stiffness", 800)} onChange={(x) => set("stiffness", x)} />
                </SubField>
                <SubField label="Damping">
                  <MiniNumber value={numAt("damping", 60)} onChange={(x) => set("damping", x)} />
                </SubField>
                <SubField label="Mass">
                  <MiniNumber value={numAt("mass", 1)} step={0.1} onChange={(x) => set("mass", x)} />
                </SubField>
              </>
            ) : kind === "inertia" ? (
              <>
                <SubField label="Power">
                  <MiniNumber value={numAt("power", 0.8)} step={0.1} onChange={(x) => set("power", x)} />
                </SubField>
                <SubField label="Decay">
                  <MiniNumber value={numAt("timeConstant", 700)} onChange={(x) => set("timeConstant", x)} />
                </SubField>
              </>
            ) : (
              <>
                <SubField label="Duration">
                  <MiniNumber value={numAt("duration", 0.3)} step={0.05} onChange={(x) => set("duration", x)} />
                </SubField>
                <SubField label="Ease">
                  <SelectControl
                    value={easeValue}
                    options={EASE_VALUES}
                    optionTitles={EASE_LABELS}
                    onChange={(x) => set("ease", x)}
                  />
                </SubField>
              </>
            )}
          </div>
        </AnchoredPopover>
      ) : null}
    </div>
  );
}

// ---- padding / border-radius (CSS shorthand, per-side editor) ----

function parseSides(input: string): [string, string, string, string] {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["0px", "0px", "0px", "0px"];
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function joinSides([t, r, b, l]: [string, string, string, string]): string {
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  if (r === l) return `${t} ${r} ${b}`;
  return `${t} ${r} ${b} ${l}`;
}

function SidesControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const sides = parseSides(value);
  const labels = ["Top", "Right", "Bottom", "Left"] as const;
  const setSide = (i: number, raw: string) => {
    const next = [...sides] as [string, string, string, string];
    next[i] = raw || "0px";
    onChange(joinSides(next));
  };
  return (
    <div className="grid grid-cols-2 gap-[4px]">
      {labels.map((label, i) => (
        <SubField key={label} label={label}>
          <MiniText value={sides[i]} onChange={(x) => setSide(i, x)} placeholder="0px" />
        </SubField>
      ))}
    </div>
  );
}

// ---- border ----

function BorderControl({
  value,
  onChange,
}: {
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const v = asObject(value);
  const set = (key: string, val: TweakValue) => onChange({ ...v, [key]: val });
  return (
    <div className="flex flex-col">
      <SubField label="Width">
        <MiniText
          value={v.borderWidth != null ? String(v.borderWidth) : ""}
          onChange={(x) => set("borderWidth", x)}
          placeholder="1px"
        />
      </SubField>
      <SubField label="Style">
        <SelectControl
          value={String(v.borderStyle ?? "solid")}
          options={["solid", "dashed", "dotted", "double"]}
          onChange={(x) => set("borderStyle", x)}
        />
      </SubField>
      <SubField label="Color">
        <ColorControl
          value={String(v.borderColor ?? "#000000")}
          onChange={(x) => set("borderColor", x)}
        />
      </SubField>
    </div>
  );
}

// ---- media (image / file) + responsive image ----

// Fallback so an image control is never left empty when removed and the control
// has no default of its own.
const DEFAULT_PREVIEW_IMAGE = "https://picsum.photos/seed/compify/600/400";

function MediaControl({
  value,
  onChange,
  defaultValue = "",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Reverted to when the image is removed (the control's default). */
  defaultValue?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage =
    value.startsWith("blob:") ||
    value.startsWith("data:image") ||
    (looksLikeUrl(value) && /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(value));

  // Temporary local preview only — turn the picked file into a blob URL so the
  // component renders it immediately. Nothing is uploaded/saved; the old blob is
  // revoked so we don't leak. (A blob: URL won't work once copied out, by design.)
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (value.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(URL.createObjectURL(file));
  }

  function remove() {
    if (value.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(defaultValue || DEFAULT_PREVIEW_IMAGE);
  }

  return (
    <div className="flex w-full items-center gap-2">
      {/* With an image set: the thumbnail shows a × on hover to remove it (revert
          to default). Without one: the upload button to pick a local preview. */}
      {isImage ? (
        <div className="group/thumb relative size-[26px] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-full border border-field object-cover" />
          <button
            type="button"
            onClick={remove}
            aria-label="Remove image"
            title="Remove image (revert to default)"
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover/thumb:opacity-100"
          >
            <RiCloseLine size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Upload image for preview"
          title="Upload an image (preview only — not saved)"
          className="ui-press flex size-[26px] shrink-0 items-center justify-center border border-field bg-field text-[#c8c8c8] transition hover:text-white"
        >
          <RiUpload2Line size={14} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <div className="min-w-0 flex-1">
        <TextControl value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function ResponsiveImageControl({
  control,
  value,
  onChange,
}: {
  control: TweakControl;
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const v = asObject(value);
  const defaults = asObject(control.default);
  const set = (key: string, val: TweakValue) => onChange({ ...v, [key]: val });
  return (
    <div className="flex flex-col">
      <SubField label="Source">
        <MediaControl
          value={String(v.src ?? "")}
          onChange={(x) => set("src", x)}
          defaultValue={String(defaults.src ?? "")}
        />
      </SubField>
      <SubField label="Alt">
        <MiniText value={String(v.alt ?? "")} onChange={(x) => set("alt", x)} />
      </SubField>
    </div>
  );
}

// ---- date ----

function DateControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Framer dates are ISO strings; trim to the date portion for the picker.
  const dateValue = value ? value.slice(0, 10) : "";
  return (
    <input
      type="date"
      value={dateValue}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-field bg-field py-[4px] pl-[6px] pr-[3px] font-mono text-xsm text-[#c8c8c8] outline-none ui-micro"
    />
  );
}

// ---- rich text ----

function RichTextControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y border border-field bg-field px-[6px] py-[4px] font-mono text-xsm text-[#c8c8c8] outline-none ui-micro"
    />
  );
}

// ---- object (nested controls) ----

function ObjectControl({
  control,
  value,
  onChange,
}: {
  control: TweakControl;
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  // Collapsed by default — objects are secondary config groups (Framer shows
  // them as closed disclosures), so the panel isn't a wall of open fields.
  const [open, setOpen] = useState(false);
  const root = useContext(RootStateContext);
  const v = asObject(value);
  const scope = v as Record<string, unknown>;
  const fields = (control.controls ?? []).filter((field) => controlVisible(field, scope, root));

  return (
    // Subtle outline (no fill) so the group's start/end are easy to see, inset a
    // little from the panel edges and spaced from neighbouring controls.
    <div className="mx-[6px] my-[8px] border border-panel-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ui-micro flex w-full items-center gap-2 px-[12px] py-[9px]"
      >
        <RiArrowDownSLine
          size={12}
          className={cn(
            "shrink-0 text-white transition-transform duration-micro ease-micro",
            !open && "-rotate-90",
          )}
        />
        <span className="text-sm tracking-[-0.42px] text-white">{control.label}</span>
      </button>
      {open ? (
        // Divider lives on this static container, not the (animated) header
        // button — putting it on the button flashed white as its border-color
        // transitioned from the default.
        <div className="border-t border-panel-line">
          {fields.length ? (
            fields.map((field) => (
              <ControlField
                key={field.key}
                control={field}
                value={v[field.key] ?? field.default}
                onChange={(nv) => onChange({ ...v, [field.key]: nv })}
              />
            ))
          ) : (
            <p className="px-[14px] py-[6px] text-2xs text-[#777]">No options</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---- array (repeatable rows of objects or scalars) ----

/** Whether a string looks like an image URL we can thumbnail. */
function isImageUrl(s: string): boolean {
  return (
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(s) ||
    /picsum\.photos|unsplash/i.test(s) ||
    s.startsWith("blob:") ||
    s.startsWith("data:image")
  );
}

/** Whether a string is a CSS color value. */
function isColorStr(s: string): boolean {
  const t = s.trim();
  return /^#[0-9a-f]{3,8}$/i.test(t) || /^(rgb|hsl)a?\(/i.test(t);
}

/** Best preview URL for an item: the image/file field value, or any value that
 *  looks like a URL (covers cases like coverflow's `srcUrl` overriding `src`). */
function pickUrl(obj: TweakObject, fields: TweakControl[] | undefined): string | undefined {
  for (const f of fields ?? []) {
    const v = obj[f.key];
    if ((f.type === "image" || f.type === "file") && typeof v === "string" && v) return v;
    if (f.type === "responsiveimage") {
      const o = asObject(v);
      if (typeof o.src === "string" && o.src) return o.src;
    }
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && /^(https?:|blob:|data:|\/)/i.test(v.trim())) return v;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && isImageUrl(v)) return v;
  }
  return undefined;
}

/** True when the item is an image — by schema (has an image-type field) or by a
 *  value that looks like an image URL. */
function hasImage(obj: TweakObject, fields: TweakControl[] | undefined): boolean {
  if ((fields ?? []).some((f) => f.type === "image" || f.type === "file" || f.type === "responsiveimage")) {
    return true;
  }
  const url = pickUrl(obj, fields);
  return !!url && isImageUrl(url);
}

function findColor(obj: TweakObject, fields: TweakControl[] | undefined): string | undefined {
  for (const f of fields ?? []) {
    const v = obj[f.key];
    if (f.type === "color" && typeof v === "string" && v) return v;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && isColorStr(v)) return v;
  }
  return undefined;
}

function findText(obj: TweakObject, fields: TweakControl[] | undefined): string | undefined {
  for (const f of fields ?? []) {
    const v = obj[f.key];
    if (
      (f.type === "string" || f.type === "link") &&
      typeof v === "string" &&
      v.trim() &&
      !isImageUrl(v) &&
      !isColorStr(v)
    ) {
      return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && v.trim() && !isImageUrl(v) && !isColorStr(v)) return v;
  }
  return undefined;
}

/**
 * Classify a collapsed array item: image / color show a square preview + a
 * generic "Image N" / "Color N" title; text shows just its text and no square.
 */
function describeItem(
  row: TweakValue,
  fields: TweakControl[] | undefined,
  itemControl: TweakControl | undefined,
  index: number,
): { kind: "image" | "color" | "text"; preview?: string; title: string } {
  if (itemControl && !fields?.length) {
    if (itemControl.type === "image" || itemControl.type === "file") {
      const val = typeof row === "string" ? row : "";
      return { kind: "image", preview: val || undefined, title: `Image ${index + 1}` };
    }
    if (itemControl.type === "responsiveimage") {
      const src = asObject(row).src;
      return { kind: "image", preview: typeof src === "string" ? src : undefined, title: `Image ${index + 1}` };
    }
    if (itemControl.type === "color") {
      const val = typeof row === "string" ? row : "";
      return { kind: "color", preview: val || undefined, title: `Color ${index + 1}` };
    }
    return { kind: "text", title: typeof row === "string" && row ? row : `Item ${index + 1}` };
  }
  const obj = asObject(row);
  // Image wins (by schema or URL) and always shows a square — even if the
  // current preview URL is empty.
  if (hasImage(obj, fields)) {
    return { kind: "image", preview: pickUrl(obj, fields), title: `Image ${index + 1}` };
  }
  const text = findText(obj, fields);
  if (text) return { kind: "text", title: text };
  const hasColorField = (fields ?? []).some((f) => f.type === "color");
  const color = findColor(obj, fields);
  if (hasColorField || color) {
    return { kind: "color", preview: color, title: `Color ${index + 1}` };
  }
  return { kind: "text", title: `Item ${index + 1}` };
}

function ArrayItemRow({
  index,
  row,
  fields,
  itemControl,
  root,
  onChange,
  onRemove,
  onDragStart,
  onDrop,
}: {
  index: number;
  row: TweakValue;
  fields: TweakControl[] | undefined;
  itemControl: TweakControl | undefined;
  root: Record<string, unknown>;
  onChange: (next: TweakValue) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [open, setOpen] = useState(false);
  const obj = asObject(row);
  const item = describeItem(row, fields, itemControl, index);

  return (
    <div
      className="group/item border border-panel-line bg-[#1c1c1e]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 px-[8px] py-[6px]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {/* Square preview only for image/color items; text items get none. */}
          {item.kind === "image" ? (
            item.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.preview} alt="" className="size-[22px] shrink-0 border border-field object-cover" />
            ) : (
              <span className="size-[22px] shrink-0 border border-field bg-elevated" />
            )
          ) : item.kind === "color" ? (
            <span
              className="size-[22px] shrink-0 border border-field"
              style={{ backgroundColor: item.preview || "transparent" }}
            />
          ) : null}
          <span className="min-w-0 truncate text-xsm text-[#c8c8c8]">{item.title}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="shrink-0 text-muted opacity-0 transition hover:text-[#ff6b6b] group-hover/item:opacity-100"
        >
          <RiCloseLine size={14} />
        </button>
        <span
          draggable
          onDragStart={onDragStart}
          aria-label="Drag to reorder"
          className="shrink-0 cursor-grab text-muted active:cursor-grabbing"
        >
          <RiDraggable size={14} />
        </span>
      </div>
      {open ? (
        <div className="flex flex-col gap-[2px] border-t border-panel-line px-[8px] py-[8px]">
          {fields ? (
            fields
              .filter((field) => controlVisible(field, obj as Record<string, unknown>, root))
              .map((field) => (
                <SubField key={field.key} label={field.label}>
                  {renderControl(field, obj[field.key] ?? field.default, (nv) =>
                    onChange({ ...obj, [field.key]: nv }),
                  )}
                </SubField>
              ))
          ) : itemControl ? (
            renderControl(itemControl, row, (nv) => onChange(nv))
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** A floating dropdown popover anchored to `anchorRef` — no backdrop, doesn't
 *  block the view. Positions below the trigger (flips above when tight), clamps
 *  to the viewport, scrolls, and closes on outside click / Escape. Shared by the
 *  array and transition editors. */
function AnchoredPopover({
  anchorRef,
  title,
  onClose,
  width = 320,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number; below: boolean } | null>(null);

  useEffect(() => {
    const GAP = 4;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Sit INSIDE the control-panel column (a small margin in from its borders),
      // so the popover floats within the panel rather than over/past its edges.
      const panel = (el.closest("[data-tweak-panel]") as HTMLElement | null)?.getBoundingClientRect();
      // Close once the trigger scrolls out of the panel's visible area, instead
      // of leaving the popover floating detached.
      if (panel && (r.bottom <= panel.top + 2 || r.top >= panel.bottom - 2)) {
        onClose();
        return;
      }
      const INSET = 8;
      const w = panel ? panel.width - INSET * 2 : width;
      const left = panel ? panel.left + INSET : Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const belowSpace = window.innerHeight - r.bottom - GAP - 8;
      const aboveSpace = r.top - GAP - 8;
      const below = belowSpace >= 220 || belowSpace >= aboveSpace;
      const maxHeight = Math.min(
        Math.max(below ? belowSpace : aboveSpace, 160),
        Math.round(window.innerHeight * 0.7),
      );
      // Anchor the edge nearest the trigger: top below it, or bottom above it —
      // so a short popover sits right by the button instead of pinning to a far edge.
      if (below) {
        setPos({ top: r.bottom + GAP, left, width: w, maxHeight, below });
      } else {
        setPos({ bottom: window.innerHeight - r.top + GAP, left, width: w, maxHeight, below });
      }
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (anchorRef.current?.contains(t) || popRef.current?.contains(t)) return;
      // Keep open when interacting with a portaled child UI opened from inside
      // the popover — a Radix Select dropdown, or the color/font pickers (which
      // portal to <body>, so they'd otherwise read as an outside click).
      if (t.closest?.("[data-radix-popper-content-wrapper]")) return;
      if (t.closest?.("[data-tweak-popover]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [anchorRef, onClose, width]);

  if (!pos || typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      ref={popRef}
      initial={{ opacity: 0, scale: 0.96, y: pos.below ? -8 : 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        zIndex: 60,
        transformOrigin: pos.below ? "top center" : "bottom center",
      }}
      className="flex flex-col border border-panel-line bg-panel shadow-[0px_8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex h-[40px] shrink-0 items-center justify-between border-b border-panel-line px-3">
        <span className="text-sm text-white">{title}</span>
        <button type="button" onClick={onClose} aria-label="Close">
          <RiCloseLine size={16} className="text-muted transition hover:text-white" />
        </button>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
    </motion.div>,
    document.body,
  );
}

function ArrayControl({
  control,
  value,
  onChange,
}: {
  control: TweakControl;
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useContext(RootStateContext);
  const rows = asArray(value);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fields = control.items;
  const itemControl = control.itemControl;
  const atMax = control.maxCount != null && rows.length >= control.maxCount;
  const dragIndex = useRef<number | null>(null);

  const setRow = (index: number, next: TweakValue) =>
    onChange(rows.map((r, i) => (i === index ? next : r)));
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const addRow = () =>
    onChange([...rows, fields ? defaultArrayRow(fields) : (itemControl?.default ?? "")]);
  const drop = (to: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ui-micro flex w-full items-center gap-2 border border-field bg-field px-[8px] py-[5px] text-xsm text-[#c8c8c8] transition hover:text-white"
      >
        <RiBracesLine size={14} className="shrink-0 text-muted" />
        <span>
          {rows.length} {rows.length === 1 ? "Item" : "Items"}
        </span>
      </button>
      {open ? (
        <AnchoredPopover anchorRef={btnRef} title={control.label} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-[6px] p-2">
            {rows.map((row, index) => (
              <ArrayItemRow
                key={index}
                index={index}
                row={row}
                fields={fields}
                itemControl={itemControl}
                root={root}
                onChange={(next) => setRow(index, next)}
                onRemove={() => removeRow(index)}
                onDragStart={() => (dragIndex.current = index)}
                onDrop={() => drop(index)}
              />
            ))}
            {!atMax ? (
              <button
                type="button"
                onClick={addRow}
                className="ui-press border border-dashed border-panel-line py-[8px] text-sm text-muted transition hover:text-white"
              >
                Add…
              </button>
            ) : null}
          </div>
        </AnchoredPopover>
      ) : null}
    </div>
  );
}

function renderControl(
  control: TweakControl,
  value: TweakValue,
  onChange: (value: TweakValue) => void,
) {
  switch (control.type) {
    case "color":
      return (
        <ColorControl value={String(value ?? "")} onChange={onChange} controlKey={control.key} />
      );

    case "enum":
    case "segmentedenum": {
      const options = control.options ?? [];
      return (
        <SelectControl
          value={String(value ?? "")}
          options={options}
          optionTitles={control.optionTitles ?? options.map(humanizeOption)}
          onChange={onChange}
        />
      );
    }

    case "boolean":
      return <YesNoControl value={Boolean(value)} onChange={onChange} />;

    case "number": {
      const numeric = Number(value);
      const min = control.min ?? 0;
      if (useNumberField(control, numeric)) {
        return (
          <NumberFieldControl
            value={numeric}
            min={min}
            max={control.max}
            step={control.step ?? 1}
            onChange={onChange}
          />
        );
      }
      return (
        <FigmaSlider
          min={min}
          max={numberSliderMax(control, numeric)}
          step={control.step ?? 1}
          value={numeric}
          onChange={onChange}
        />
      );
    }

    case "font":
      return <FontControl value={value} onChange={onChange} />;

    case "transition":
      return <TransitionControl value={value} onChange={onChange} />;

    case "padding":
    case "borderradius":
      return <SidesControl value={String(value ?? "0px")} onChange={onChange} />;

    case "border":
      return <BorderControl value={value} onChange={onChange} />;

    case "boxshadow":
    case "link":
      return <TextControl value={String(value ?? "")} onChange={onChange} />;

    case "image":
    case "file":
      return (
        <MediaControl
          value={String(value ?? "")}
          onChange={onChange}
          defaultValue={String(control.default ?? "")}
        />
      );

    case "responsiveimage":
      return <ResponsiveImageControl control={control} value={value} onChange={onChange} />;

    case "date":
      return <DateControl value={String(value ?? "")} onChange={onChange} />;

    case "cursor":
      return (
        <SelectControl
          value={String(value ?? "auto")}
          options={CURSORS}
          onChange={onChange}
        />
      );

    case "richtext":
      return <RichTextControl value={String(value ?? "")} onChange={onChange} />;

    case "object":
      return <ObjectControl control={control} value={value} onChange={onChange} />;

    case "array":
      return <ArrayControl control={control} value={value} onChange={onChange} />;

    case "string":
    default:
      return <TextControl value={String(value ?? "")} onChange={onChange} />;
  }
}

/** A control row: inline for simple controls, full-width block for complex ones. */
function ControlField({
  control,
  value,
  onChange,
}: {
  control: TweakControl;
  value: TweakValue;
  onChange: (value: TweakValue) => void;
}) {
  const editor = renderControl(control, value, onChange);

  // Object renders its own disclosure header + ControlField rows per field, so it
  // reads exactly like the rest of the panel — no extra wrapper/indent here.
  if (control.type === "object") {
    return editor;
  }

  // Font expands into its own labelled rows (Font family / weight / size / …),
  // so there's no parent "Font" card or label — each reads like a normal prop.
  if (control.type === "font") {
    return editor;
  }

  // Array / transition collapse to a button that opens a dropdown popover,
  // shown as a normal labelled row.
  if (control.type === "array" || control.type === "transition") {
    return <ControlRow label={control.label}>{editor}</ControlRow>;
  }

  if (BLOCK_TYPES.has(control.type)) {
    return (
      <div className="px-[14px] py-[8px]">
        <span className="mb-[6px] block text-sm tracking-[-0.42px] text-muted">
          {control.label}
        </span>
        <div className="min-w-0">{editor}</div>
        {control.description ? (
          <p className="mt-[6px] text-2xs leading-[14px] text-[#777]">
            {control.description}
          </p>
        ) : null}
      </div>
    );
  }

  return <ControlRow label={control.label}>{editor}</ControlRow>;
}

export function TweakPanel({
  schema,
  state,
  onChange,
  onReset,
  gradientKeys = null,
}: {
  schema: TweakControl[];
  state: TweakState;
  onChange: (key: string, value: TweakValue) => void;
  onReset: () => void;
  /** Color keys whose value renders as a gradient (probed). null = none. */
  gradientKeys?: Set<string> | null;
}) {
  // Visibility depends on live state (Framer-style conditional `hidden`), so this
  // recomputes as the user tweaks — a group with all-hidden controls drops out.
  const groups = useMemo(() => {
    const scope = state as Record<string, unknown>;
    const map = new Map<string, TweakControl[]>();
    for (const control of schema) {
      if (!controlVisible(control, scope, scope)) continue;
      const group = controlGroup(control);
      const list = map.get(group) ?? [];
      list.push(control);
      map.set(group, list);
    }
    return [...map.entries()];
  }, [schema, state]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Trap the wheel across the WHOLE panel (title + controls + reset button) so it
  // never scrolls the page. Over the controls list it scrolls naturally (and is
  // pinned at the edges); over the title/button/gaps the delta is forwarded to
  // the list, so the panel always scrolls and the page never does.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      if (scroller.contains(e.target as Node)) {
        const atTop = delta < 0 && scroller.scrollTop <= 0;
        const atBottom =
          delta > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        if (atTop || atBottom) e.preventDefault();
        return;
      }
      e.preventDefault();
      scroller.scrollTop += delta;
    };
    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <RootStateContext.Provider value={state as Record<string, unknown>}>
    <GradientSupportContext.Provider value={gradientKeys}>
    <div
      ref={panelRef}
      data-tweak-panel
      className="flex h-full w-full shrink-0 overflow-hidden border border-stroke xl:w-[325px] 3xl:w-[500px]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-panel-line bg-panel">
        <div className="shrink-0 border-b border-panel-line">
          <div className="flex h-[48px] items-center px-4">
            <p className="text-sm capitalize tracking-[-0.28px] text-white">
              Controls
            </p>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="no-scrollbar h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-10"
          >
            {groups.map(([group, controls], index) => {
              const isCollapsed = collapsed[group] ?? false;
              return (
                <div key={group}>
                  <SectionHeader
                    title={group}
                    bordered={index > 0}
                    collapsed={isCollapsed}
                    onToggle={() =>
                      setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }))
                    }
                  />
                  <AnimatePresence initial={false}>
                    {!isCollapsed ? (
                      <motion.div
                        key={group}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={collapseVariants}
                        transition={microTransition}
                        className="overflow-hidden"
                      >
                        {controls.map((control) => (
                          <ControlField
                            key={control.key}
                            control={control}
                            value={state[control.key]}
                            onChange={(v) => onChange(control.key, v)}
                          />
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[65px] bg-gradient-to-b from-transparent to-panel"
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="ui-micro ui-press flex w-full shrink-0 items-center justify-center border-t border-panel-line bg-[#343434] px-[14px] pt-[10px] pb-[14px] text-sm font-medium tracking-[-0.28px] text-[#b8b8b8] hover:text-white"
        >
          Reset All Settings
        </button>
      </div>
    </div>
    </GradientSupportContext.Provider>
    </RootStateContext.Provider>
  );
}
