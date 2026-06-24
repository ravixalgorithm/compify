"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Scales its child down (never up) so the WHOLE component fits inside the
 * stage, centered. Used by the "Fit" preview mode so any component — large or
 * small, however it was authored in Framer — is fully visible and centered.
 *
 * Works by measuring the child's natural layout size (offsetWidth/Height, which
 * a CSS transform does not affect) against the stage, then applying transform:
 * scale. Re-measures on resize.
 */
export function ScaleToFit({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner) return;

    const measure = () => {
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      const cw = inner.offsetWidth;
      const ch = inner.offsetHeight;
      if (!cw || !ch || !sw || !sh) return;
      // Contain: fit the whole thing, only ever scaling down.
      const next = Math.min(sw / cw, sh / ch, 1);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="flex size-full items-center justify-center overflow-hidden">
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}
