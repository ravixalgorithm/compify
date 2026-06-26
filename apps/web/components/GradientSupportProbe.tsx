"use client";

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { TweakState } from "@compify/shared";
import { getLibraryComponent } from "@compify/library";
import { DynamicComponent } from "./DynamicComponent";

// A CSS gradient only renders where a component applies the value to
// `background`/`background-image` (not `color`, `backgroundColor`, `fill`,
// `borderColor`, …). We can't see how an arbitrary component uses each prop, so
// we probe it: render it hidden with a UNIQUE sentinel gradient injected into
// every color prop, then read back the computed `background-image` of the whole
// subtree. A color prop "supports gradients" only if its sentinel actually shows
// up as a rendered gradient. This never touches component code.

/** Distinctive, unlikely-to-collide gradient whose first stop encodes `i`. */
function sentinelGradient(i: number): string {
  return `linear-gradient(90deg, rgb(253, 7, ${i}) 0%, rgb(252, 9, ${i}) 100%)`;
}

/** Collect every rgb()/rgba() triple that appears in gradient-bearing props. */
function collectTriples(root: HTMLElement): Set<string> {
  const present = new Set<string>();
  const re = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/g;
  const els: Element[] = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of els) {
    const cs = getComputedStyle(el as HTMLElement);
    const sources = [
      cs.backgroundImage,
      cs.borderImageSource,
      cs.maskImage,
      (cs as unknown as Record<string, string>).webkitMaskImage,
    ];
    for (const src of sources) {
      if (!src || src === "none") continue;
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) present.add(`${m[1]},${m[2]},${m[3]}`);
    }
  }
  return present;
}

class ProbeBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function GradientSupportProbe({
  name,
  moduleUrl,
  defaults,
  colorKeys,
  onResult,
}: {
  name: string;
  moduleUrl?: string;
  /** Full default props so the component renders normally during the probe. */
  defaults: TweakState;
  /** Keys of the component's color controls, in stable order. */
  colorKeys: string[];
  /** Called once with the subset of keys that render as a gradient. */
  onResult: (supported: Set<string>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const sentinelProps = useMemo(() => {
    const props: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    colorKeys.forEach((key, i) => {
      props[key] = sentinelGradient(i);
    });
    return props;
  }, [defaults, colorKeys]);

  useEffect(() => {
    let raf = 0;
    let tries = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const root = ref.current;
      const present = root ? collectTriples(root) : new Set<string>();
      onResultRef.current(new Set(colorKeys.filter((_, i) => present.has(`253,7,${i}`))));
    };
    const tick = () => {
      tries++;
      const el = ref.current;
      // Wait until the component has actually rendered DOM (DB modules load
      // async), then give one more frame for styles to resolve before reading.
      if (el && el.querySelector("*")) {
        raf = requestAnimationFrame(finish);
        return;
      }
      if (tries > 120) {
        finish(); // ~2s fallback → treat as unsupported
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      done = true;
    };
  }, [colorKeys, sentinelProps]);

  const inner = moduleUrl ? (
    <DynamicComponent moduleUrl={moduleUrl} componentProps={sentinelProps} />
  ) : (
    (() => {
      const Lib = getLibraryComponent(name) as
        | ((props: Record<string, unknown>) => ReactNode)
        | undefined;
      return Lib ? <Lib {...sentinelProps} /> : null;
    })()
  );

  return (
    <div
      ref={ref}
      aria-hidden
      // Off-screen, non-interactive, zero-opacity — present in layout so computed
      // styles resolve, but invisible to the user.
      style={{
        position: "fixed",
        left: -100000,
        top: 0,
        width: 400,
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      <ProbeBoundary onError={() => onResultRef.current(new Set())}>{inner}</ProbeBoundary>
    </div>
  );
}
