"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RiArrowDownSLine } from "@remixicon/react";
import type { TweakControl, TweakState } from "@compify/shared";
import { isTweakableControl } from "@compify/shared";
import { cn } from "@/lib/cn";
import { collapseVariants, microTransition } from "@/lib/motion";
import * as Select from "@/components/ui/select";
import { ColorPicker } from "@/components/ColorPicker";

function controlGroup(control: TweakControl): string {
  if (control.group) return control.group;
  if (control.type === "color") return "Colors";
  if (
    control.type === "number" &&
    /speed|float|rotation|animation|duration/i.test(control.label)
  ) {
    return "Animation";
  }
  if (control.type === "number") return "Layout";
  return "Random";
}

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-[125px] shrink-0 text-[14px] tracking-[-0.42px] text-muted">
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
          "w-[40px] shrink-0 border border-black bg-black px-[6px] py-[4px] text-center font-mono text-[11px] text-[#aaa] outline-none",
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex w-[40px] shrink-0 items-start justify-center border border-black bg-black px-[6px] py-[4px]",
        className
      )}
    >
      <span className="font-mono text-[11px] text-[#aaa]">{value}</span>
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
        <div className="absolute left-0 right-0 top-[calc(50%+1px)] h-[4px] -translate-y-1/2 bg-[#2a2a2a]" />
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
      const below = r.bottom + 10 + PICKER_H <= window.innerHeight;
      const top = below ? r.bottom + 10 : Math.max(8, r.top - 10 - PICKER_H);
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
        className="relative size-[18px] shrink-0 border border-[#222]"
        aria-label="Open color picker"
        aria-expanded={open}
      >
        <span className="block size-full" style={{ backgroundColor: value }} aria-hidden />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-0 flex-1 border border-black bg-black py-[4px] pl-2 pr-2 font-mono text-[13px] uppercase text-[#aaa] outline-none"
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

function TextControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-black bg-black py-[4px] pl-[6px] pr-[3px] font-mono text-[13px] text-[#aaa] outline-none ui-micro"
    />
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
      className="w-full border border-black bg-black py-[4px] pl-[6px] pr-[3px] font-mono text-[13px] text-[#aaa] outline-none ui-micro"
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
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label="Select option">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {options.map((opt) => (
          <Select.Item key={opt} value={opt}>
            {opt}
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
    <div className="relative flex w-full items-stretch bg-black">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-px -bottom-px w-[calc(50%+2px)] border border-stroke bg-elevated",
          "transition-[left] duration-micro ease-micro",
          value ? "-left-px" : "left-[calc(50%-1px)]",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-[13px] ui-micro",
          value ? "text-white" : "text-[#aaa]",
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "ui-press relative z-10 flex flex-1 items-center justify-center p-1 text-[13px] ui-micro",
          !value ? "text-white" : "text-[#aaa]",
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
        bordered && "border-t border-stroke",
      )}
    >
      <RiArrowDownSLine
        size={10}
        className={cn(
          "shrink-0 text-white transition-transform duration-micro ease-micro",
          collapsed && "-rotate-90"
        )}
      />
      <span className="text-[12px] uppercase tracking-[-0.24px] text-white">
        {title}
      </span>
    </button>
  );
}

function renderControl(
  control: TweakControl,
  value: string | number | boolean,
  onChange: (value: string | number | boolean) => void
) {
  switch (control.type) {
    case "color":
      return (
        <ColorControl value={String(value)} onChange={(v) => onChange(v)} />
      );

    case "enum":
      return (
        <SelectControl
          value={String(value)}
          options={control.options ?? []}
          onChange={(v) => onChange(v)}
        />
      );

    case "boolean":
      return (
        <YesNoControl
          value={Boolean(value)}
          onChange={(v) => onChange(v)}
        />
      );

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
            onChange={(v) => onChange(v)}
          />
        );
      }

      return (
        <FigmaSlider
          min={min}
          max={numberSliderMax(control, numeric)}
          step={control.step ?? 1}
          value={numeric}
          onChange={(v) => onChange(v)}
        />
      );
    }

    case "string":
    default:
      return (
        <TextControl value={String(value)} onChange={(v) => onChange(v)} />
      );
  }
}

export function TweakPanel({
  schema,
  state,
  onChange,
  onReset,
}: {
  schema: TweakControl[];
  state: TweakState;
  onChange: (key: string, value: string | number | boolean) => void;
  onReset: () => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TweakControl[]>();
    for (const control of schema) {
      if (!isTweakableControl(control)) continue;
      const group = controlGroup(control);
      const list = map.get(group) ?? [];
      list.push(control);
      map.set(group, list);
    }
    return [...map.entries()];
  }, [schema]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full w-full shrink-0 overflow-hidden border border-stroke xl:w-[325px]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-stroke bg-surface">
        <div className="shrink-0 border-b border-stroke">
          <div className="flex h-[48px] items-center px-4">
            <p className="text-[14px] capitalize tracking-[-0.28px] text-white">
              Controls
            </p>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="no-scrollbar h-full overflow-x-hidden overflow-y-auto pb-6">
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
                          <ControlRow key={control.key} label={control.label}>
                            {renderControl(
                              control,
                              state[control.key] as string | number | boolean,
                              (v) => onChange(control.key, v),
                            )}
                          </ControlRow>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[65px] bg-gradient-to-b from-transparent to-surface"
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="ui-micro ui-press flex w-full shrink-0 items-center justify-center border-t border-stroke bg-bg px-[14px] pt-[10px] pb-[14px] text-[14px] font-medium tracking-[-0.28px] text-muted hover:text-white"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
}
