"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiFileCopyLine,
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

function colorPickerValue(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const rgba = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (!rgba) return "#7c7c7c";
  const hex = (n: string) =>
    Math.min(255, Number(n)).toString(16).padStart(2, "0");
  return `#${hex(rgba[1])}${hex(rgba[2])}${hex(rgba[3])}`;
}

function ColorControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const pickerValue = colorPickerValue(value);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    { top: number; left: number; caretSide: "top" | "bottom"; caretLeft: number } | null
  >(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // The picker is rendered in a portal (fixed position) so the tweak panel's
  // overflow-hidden scroll container can't clip it. It stacks directly below the
  // swatch (flips above if there's no room), with the caret pointing at it.
  useEffect(() => {
    if (!open) return;
    const PICKER_W = 225;
    const PICKER_H = 240;
    const place = () => {
      const el = swatchRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const left = Math.max(8, Math.min(center - PICKER_W / 2, window.innerWidth - PICKER_W - 8));
      // Gap between the swatch and the picker body. The caret pokes ~6px toward
      // the swatch on top of this, so keep it small to sit close to the click.
      const GAP = 4;
      const below = r.bottom + GAP + PICKER_H <= window.innerHeight;
      const top = below ? r.bottom + GAP : Math.max(8, r.top - GAP - PICKER_H);
      const caretLeft = Math.max(12, Math.min(center - left, PICKER_W - 12));
      setPos({ top, left, caretSide: below ? "top" : "bottom", caretLeft });
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
        <span className="block size-full" style={{ backgroundColor: value }} aria-hidden />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-0 flex-1 border border-field bg-field py-[4px] pl-2 pr-2 font-mono text-xsm uppercase text-[#c8c8c8] outline-none"
      />
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div ref={popRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}>
              <ColorPicker
                value={pickerValue}
                onChange={onChange}
                onApply={(hex) => {
                  onChange(hex);
                  setOpen(false);
                }}
                caretSide={pos.caretSide}
                caretLeft={pos.caretLeft}
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
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (Number.isNaN(next)) return;
        const clamped =
          max != null ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
        onChange(clamped);
      }}
      className="w-full border border-field bg-field py-[4px] pl-[6px] pr-[3px] font-mono text-xsm text-[#c8c8c8] outline-none ui-micro"
    />
  );
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
  "font",
  "transition",
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
      <span className="w-[84px] shrink-0 text-2xs tracking-[-0.24px] text-muted">
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
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (!Number.isNaN(next)) onChange(next);
      }}
      className="w-full border border-field bg-field py-[4px] pl-[6px] pr-[3px] font-mono text-2xs text-[#c8c8c8] outline-none ui-micro"
    />
  );
}

// ---- typography ----

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

  return (
    <div className="flex flex-col border border-panel-line bg-field/30 p-[8px]">
      <SubField label="Family">
        <FontFamilyPicker
          value={text("fontFamily")}
          onChange={(family) => set("fontFamily", family)}
        />
      </SubField>
      <SubField label="Weight">
        <MiniText
          value={v.variant != null ? String(v.variant) : text("fontWeight")}
          onChange={(x) => set("variant", x)}
          placeholder="Regular"
        />
      </SubField>
      <SubField label="Size">
        <MiniText value={text("fontSize")} onChange={(x) => set("fontSize", x)} placeholder="16px" />
      </SubField>
      <SubField label="Line height">
        <MiniText value={text("lineHeight")} onChange={(x) => set("lineHeight", x)} placeholder="1.5em" />
      </SubField>
      <SubField label="Spacing">
        <MiniText value={text("letterSpacing")} onChange={(x) => set("letterSpacing", x)} placeholder="0em" />
      </SubField>
      <SubField label="Align">
        <SelectControl
          value={text("textAlign") || "left"}
          options={["left", "center", "right", "justify"]}
          onChange={(x) => set("textAlign", x)}
        />
      </SubField>
    </div>
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
  const v = asObject(value);
  const set = (key: string, val: TweakValue) => onChange({ ...v, [key]: val });
  const kind = String(v.type ?? "spring");
  const numAt = (key: string, fallback: number) =>
    typeof v[key] === "number" ? (v[key] as number) : fallback;
  // Ease can be a named string or a cubic-bezier array; the dropdown drives the
  // named set and leaves an existing array value alone until a name is picked.
  const easeValue = typeof v.ease === "string" ? v.ease : "easeInOut";

  return (
    <div className="flex flex-col border border-panel-line bg-field/30 p-[8px]">
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
    <div className="grid grid-cols-2 gap-[4px] border border-panel-line bg-field/30 p-[8px]">
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
    <div className="flex flex-col border border-panel-line bg-field/30 p-[8px]">
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
    <div className="flex flex-col border border-panel-line bg-field/30 p-[8px]">
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

/** A collapsible disclosure group header (chevron + label), Framer-style. */
function GroupHeader({
  label,
  open,
  onToggle,
  trailing,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="ui-micro flex w-full items-center gap-2 px-[10px] py-[7px]"
    >
      <RiArrowDownSLine
        size={10}
        className={cn(
          "shrink-0 text-white transition-transform duration-micro ease-micro",
          !open && "-rotate-90",
        )}
      />
      <span className="text-xsm tracking-[-0.24px] text-white">{label}</span>
      {trailing != null ? <span className="ml-auto">{trailing}</span> : null}
    </button>
  );
}

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
    <div className="border border-panel-line bg-field/30">
      <GroupHeader label={control.label} open={open} onToggle={() => setOpen((o) => !o)} />
      {open ? (
        <div className="flex flex-col gap-[2px] border-t border-panel-line px-[10px] py-[8px]">
          {fields.length ? (
            fields.map((field) => (
              <SubField key={field.key} label={field.label}>
                {renderControl(field, v[field.key] ?? field.default, (nv) =>
                  onChange({ ...v, [field.key]: nv }),
                )}
              </SubField>
            ))
          ) : (
            <p className="text-2xs text-[#777]">No options</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---- array (repeatable rows of objects or scalars) ----

function ArrayControl({
  control,
  value,
  onChange,
}: {
  control: TweakControl;
  value: TweakValue;
  onChange: (v: TweakValue) => void;
}) {
  const [open, setOpen] = useState(true);
  const root = useContext(RootStateContext);
  const rows = asArray(value);
  const itemFields = control.items;
  const itemControl = control.itemControl;
  const atMax = control.maxCount != null && rows.length >= control.maxCount;

  const setRow = (index: number, next: TweakValue) =>
    onChange(rows.map((row, i) => (i === index ? next : row)));
  const removeRow = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));
  const addRow = () => {
    const fresh: TweakValue = itemFields
      ? defaultArrayRow(itemFields)
      : (itemControl?.default ?? "");
    onChange([...rows, fresh]);
  };

  return (
    <div className="border border-panel-line bg-field/30">
      <GroupHeader
        label={control.label}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        trailing={<span className="text-2xs text-[#777]">{rows.length}</span>}
      />
      {open ? (
        <div className="flex flex-col gap-[8px] border-t border-panel-line p-[8px]">
          {rows.map((row, index) => {
            const rowScope = asObject(row) as Record<string, unknown>;
            return (
              <div key={index} className="border border-panel-line bg-[#171717] p-[8px]">
                <div className="mb-[4px] flex items-center justify-between">
                  <span className="text-2xs uppercase tracking-[-0.24px] text-[#777]">
                    {control.label} {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="ui-press text-2xs text-[#ff6b6b] hover:text-[#ff8585]"
                  >
                    Remove
                  </button>
                </div>
                {itemFields ? (
                  itemFields
                    .filter((field) => controlVisible(field, rowScope, root))
                    .map((field) => (
                      <SubField key={field.key} label={field.label}>
                        {renderControl(
                          field,
                          asObject(row)[field.key] ?? field.default,
                          (nv) => setRow(index, { ...asObject(row), [field.key]: nv }),
                        )}
                      </SubField>
                    ))
                ) : itemControl ? (
                  renderControl(itemControl, row, (nv) => setRow(index, nv))
                ) : null}
              </div>
            );
          })}
          {!atMax ? (
            <button
              type="button"
              onClick={addRow}
              className="ui-press border border-dashed border-panel-line py-[6px] text-xsm text-muted hover:text-white"
            >
              + Add {control.label}
            </button>
          ) : null}
        </div>
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
      return <ColorControl value={String(value ?? "")} onChange={onChange} />;

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

  // Object/array editors render their own collapsible disclosure header, so they
  // get the full width with no separate label row (avoids a doubled label).
  if (control.type === "object" || control.type === "array") {
    return <div className="px-[14px] py-[6px]">{editor}</div>;
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
}: {
  schema: TweakControl[];
  state: TweakState;
  onChange: (key: string, value: TweakValue) => void;
  onReset: () => void;
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
    <div
      ref={panelRef}
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
    </RootStateContext.Provider>
  );
}
