/** Equal L-arm length in px — fixed on screen, not stretched with the card. */
const CORNER_UNIT = 8;

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** L-path with vertex on the card corner; arms run along the border edges. */
const CORNER_PATH: Record<CornerPosition, string> = {
  "top-left": `M0.5 ${CORNER_UNIT - 0.5} V0.5 H${CORNER_UNIT - 0.5}`,
  "top-right": `M0.5 0.5 H${CORNER_UNIT - 0.5} M${CORNER_UNIT - 0.5} 0.5 V${CORNER_UNIT - 0.5}`,
  "bottom-left": `M0.5 ${CORNER_UNIT - 0.5} H${CORNER_UNIT - 0.5} M0.5 ${CORNER_UNIT - 0.5} V0.5`,
  "bottom-right": `M${CORNER_UNIT - 0.5} 0.5 V${CORNER_UNIT - 0.5} H0.5`,
};

const CORNER_CLASS: Record<CornerPosition, string> = {
  "top-left": "left-0 top-0",
  "top-right": "right-0 top-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

function CornerMark({ position }: { position: CornerPosition }) {
  const u = CORNER_UNIT;

  return (
    <svg
      className={`absolute ${CORNER_CLASS[position]}`}
      width={u}
      height={u}
      viewBox={`0 0 ${u} ${u}`}
      fill="none"
      aria-hidden
    >
      <path
        d={CORNER_PATH[position]}
        stroke="#989898"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Figma 120:507 frame overlay — dashed border + corner vectors (120:509).
 * Corners are fixed-size marks aligned to the border (no scale transforms).
 */
export function GalleryCardCorners() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 border border-dashed border-[#363636]" />
      <CornerMark position="top-left" />
      <CornerMark position="top-right" />
      <CornerMark position="bottom-left" />
      <CornerMark position="bottom-right" />
    </div>
  );
}
