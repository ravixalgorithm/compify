// On-demand Google Fonts loading for the tweak panel's Font control.
//
// Components run outside Framer, so nothing auto-loads the family a user picks.
// When a font value is set we inject a Google Fonts <link> for that family (the
// lenient v1 CSS API silently drops weights a font doesn't have, so we can ask
// for a common range without per-font metadata). Families are deduped by id.
//
// The picker offers `GOOGLE_FONTS` for search but also accepts free-text, so any
// valid Google family works — `ensureFontLoaded` loads whatever string is set.

import type { TweakControl, TweakState, TweakValue } from "@compify/shared";

// Generic CSS keywords / system stacks we must never send to Google Fonts.
const GENERIC = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "arial",
  "helvetica",
]);

const loaded = new Set<string>();

function cleanFamily(family: string): string {
  return family.trim().replace(/["']/g, "");
}

/** True for a family worth loading from Google (not a generic/system stack). */
export function isLoadableFont(family?: string): boolean {
  if (!family) return false;
  const f = cleanFamily(family).toLowerCase();
  return f.length > 0 && !GENERIC.has(f);
}

/** Inject a Google Fonts stylesheet for `family` once (no-op on the server). */
export function ensureFontLoaded(family?: string): void {
  if (typeof document === "undefined" || !family) return;
  const fam = cleanFamily(family);
  if (!isLoadableFont(fam) || loaded.has(fam)) return;
  loaded.add(fam);
  const id = `gf-${fam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  // v1 API: lenient about weights a static font lacks (returns the subset).
  link.href = `https://fonts.googleapis.com/css?family=${encodeURIComponent(
    fam,
  )}:300,400,500,600,700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Walk a tweak schema + state and collect every active font family — including
 * fonts nested inside object/array controls. Used to preload fonts at the
 * preview level so a family renders even when its control is in a collapsed
 * (unmounted) panel section.
 */
export function collectFontFamilies(
  schema: TweakControl[],
  state: TweakState | Record<string, TweakValue>,
): string[] {
  const out: string[] = [];
  const visit = (controls: TweakControl[], value: Record<string, TweakValue>) => {
    for (const control of controls) {
      const v = value?.[control.key];
      if (control.type === "font") {
        const fam = v && typeof v === "object" && !Array.isArray(v) ? v.fontFamily : undefined;
        if (typeof fam === "string" && fam) out.push(fam);
      } else if (control.type === "object" && control.controls) {
        if (v && typeof v === "object" && !Array.isArray(v)) visit(control.controls, v);
      } else if (control.type === "array" && control.items && Array.isArray(v)) {
        for (const row of v) {
          if (row && typeof row === "object" && !Array.isArray(row)) visit(control.items, row);
        }
      }
    }
  };
  visit(schema, state as Record<string, TweakValue>);
  return out;
}

/**
 * Curated set of popular Google families for the picker's search list. Not
 * exhaustive — the picker accepts free-text too, so any Google family loads.
 */
export const GOOGLE_FONTS: string[] = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Raleway",
  "Nunito",
  "Nunito Sans",
  "Work Sans",
  "Rubik",
  "Mulish",
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Figtree",
  "Outfit",
  "Sora",
  "Space Grotesk",
  "Lexend",
  "Be Vietnam Pro",
  "Karla",
  "Quicksand",
  "Josefin Sans",
  "Oswald",
  "Bebas Neue",
  "Anton",
  "Archivo",
  "Archivo Black",
  "Barlow",
  "Barlow Condensed",
  "Cabin",
  "Dosis",
  "Fira Sans",
  "Hind",
  "Heebo",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "IBM Plex Mono",
  "Inconsolata",
  "Kanit",
  "Libre Franklin",
  "Maven Pro",
  "Mukta",
  "Overpass",
  "Oxygen",
  "PT Sans",
  "PT Serif",
  "Prompt",
  "Public Sans",
  "Red Hat Display",
  "Red Hat Text",
  "Saira",
  "Signika Negative",
  "Titillium Web",
  "Ubuntu",
  "Urbanist",
  "Varela Round",
  "Yantramanav",
  "Zilla Slab",
  "Merriweather",
  "Playfair Display",
  "Lora",
  "Bitter",
  "Crimson Text",
  "EB Garamond",
  "Cormorant",
  "Cormorant Garamond",
  "Spectral",
  "Domine",
  "Noto Sans",
  "Noto Serif",
  "Source Serif 4",
  "Frank Ruhl Libre",
  "Libre Baskerville",
  "Vollkorn",
  "Arvo",
  "Slabo 27px",
  "Roboto Slab",
  "Roboto Condensed",
  "Roboto Mono",
  "Space Mono",
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "DM Mono",
  "Courier Prime",
  "Caveat",
  "Dancing Script",
  "Pacifico",
  "Satisfy",
  "Sacramento",
  "Great Vibes",
  "Lobster",
  "Comfortaa",
  "Fredoka",
  "Baloo 2",
  "Righteous",
  "Permanent Marker",
  "Shadows Into Light",
  "Indie Flower",
  "Amatic SC",
  "Abril Fatface",
  "Teko",
  "Chivo",
  "Exo 2",
  "Rajdhani",
  "Orbitron",
  "Audiowide",
  "Asap",
  "Catamaran",
  "Cairo",
  "Tajawal",
  "Crimson Pro",
  "Gelasio",
  "Epilogue",
  "Hanken Grotesk",
  "Onest",
  "Schibsted Grotesk",
  "Geist",
  "Instrument Sans",
  "Albert Sans",
  "Bricolage Grotesque",
];
