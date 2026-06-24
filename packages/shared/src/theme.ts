/**
 * Shared design tokens. Components default to these values, and the website
 * UI (Tailwind theme) mirrors them so previews feel consistent with the shell.
 */

export const tokens = {
  accent: "#7C3AED",
  accentSoft: "#A78BFA",
  ink: "#0B0B12",
  inkSoft: "#1A1A24",
  paper: "#0E0E16",
  fog: "#15151F",
  line: "rgba(255,255,255,0.08)",
  text: "#F5F5FA",
  textSoft: "rgba(245,245,250,0.62)",
  radius: 16,
} as const;

export type ThemeName = "light" | "dark" | "glass";

export interface ThemeSurface {
  bg: string;
  panel: string;
  text: string;
  textSoft: string;
  border: string;
  shadow: string;
}

/**
 * Resolves a theme name + accent color into the concrete surface colors a
 * component should paint with. Shared by every library component so themes
 * behave identically across the catalog.
 */
export function resolveTheme(theme: ThemeName, accent: string): ThemeSurface {
  switch (theme) {
    case "light":
      return {
        bg: "#FFFFFF",
        panel: "#F7F7FB",
        text: "#0B0B12",
        textSoft: "rgba(11,11,18,0.6)",
        border: "rgba(11,11,18,0.10)",
        shadow: "0 20px 60px -20px rgba(11,11,18,0.25)",
      };
    case "glass":
      return {
        bg: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(14,14,22,0.6))",
        panel: "rgba(255,255,255,0.06)",
        text: "#F5F5FA",
        textSoft: "rgba(245,245,250,0.7)",
        border: "rgba(255,255,255,0.16)",
        shadow: `0 24px 70px -24px ${accent}66`,
      };
    case "dark":
    default:
      return {
        bg: "#0E0E16",
        panel: "#15151F",
        text: "#F5F5FA",
        textSoft: "rgba(245,245,250,0.62)",
        border: "rgba(255,255,255,0.08)",
        shadow: `0 24px 70px -28px ${accent}55`,
      };
  }
}

/** Lightens/darkens a hex color by a delta in [-1, 1]. */
export function shade(hex: string, delta: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * delta)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * delta)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * delta)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
