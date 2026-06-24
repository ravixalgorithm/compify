import { getComponent } from "@compify/shared";

/** Curated intro grid — visually diverse, high-signal components from the library. */
// Landscape components only — the showcase boxes are 16:9, so portrait
// components (e.g. repeat-image-hover) would be cropped or shrunk.
const SHOWCASE_NAMES = [
  "lightning",
  "before-after-slider",
  "animatedbars",
  "coverflow",
] as const;

export function introShowcaseEntries() {
  return SHOWCASE_NAMES.map((name) => getComponent(name)).filter(
    (entry): entry is NonNullable<typeof entry> => entry != null,
  );
}
