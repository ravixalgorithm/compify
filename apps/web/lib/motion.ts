/** AlignUI-style micro-interaction tokens — 200ms ease-out snap. */
export const MICRO_EASE = [0.16, 1, 0.3, 1] as const;

export const MICRO_DURATION_S = 0.22;

export const microTransition = {
  duration: MICRO_DURATION_S,
  ease: MICRO_EASE,
};

/** Short crossfade for labels, icons, and inline swaps (copy feedback, etc.). */
export const swapVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** Collapsible panels — tweak sections, accordions. */
export const collapseVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

/** Shared layoutId transitions — smooth slide between sidebar rows. */
export const layoutTransition = {
  type: "spring" as const,
  stiffness: 340,
  damping: 32,
  mass: 1,
};

/** Softer spring for size/height transitions (e.g. settings modal panels). */
export const springSoft = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 1,
};

/**
 * Active-highlight wipe — the row background grows in left→right on select
 * and shrinks out right→left on deselect (scaleX with a left origin).
 * The close stays snappy; the open is a touch slower for a softer reveal.
 */
export const activeBgTransition = {
  duration: 0.3,
  ease: MICRO_EASE,
};

export const activeBgOpenTransition = {
  duration: 0.45,
  ease: MICRO_EASE,
};

/** Horizontal slide between the main sidebar and the component-detail sidebar. */
export const sidebarSlideTransition = {
  duration: 0.42,
  ease: MICRO_EASE,
};

export const fadeSlideVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const modalWidthClass = "w-[480px]";

export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export const tabContentVariants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 6 },
};
