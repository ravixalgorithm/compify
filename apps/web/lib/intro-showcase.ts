import type { RegistryEntry } from "@compify/shared";

/** Curated intro grid — visually diverse, high-signal components from the library. */
// Landscape components only — the showcase boxes are 16:9, so portrait
// components (e.g. repeat-image-hover) would be cropped or shrunk. These are
// *preferred* slugs; whichever of them exist in the live DB are used, and the
// grid falls back to the first available entries so it never links to a
// component that isn't actually published (which would 404 on tap).
const SHOWCASE_NAMES = [
  "lightning",
  "before-after-slider",
  "animatedbars",
  "coverflow",
] as const;

const SHOWCASE_COUNT = 4;

export function pickIntroShowcase(entries: RegistryEntry[]): RegistryEntry[] {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const curated = SHOWCASE_NAMES.map((name) => byName.get(name)).filter(
    (entry): entry is RegistryEntry => entry != null,
  );
  const picked = curated.length ? curated : entries;
  return picked.slice(0, SHOWCASE_COUNT);
}
