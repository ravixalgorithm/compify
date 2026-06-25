import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        // Large / 4K-class monitors — used to scale up sidebar text.
        "3xl": "1920px",
      },
      colors: {
        bg: "#111111",
        surface: "#151414",
        elevated: "#242424",
        stroke: "#212121",
        "stroke-hover": "#2e2e2e",
        divider: "rgba(43,43,43,0.5)",
        // Control panel (tweak panel) surfaces
        panel: "#232324",
        "panel-line": "#333333",
        field: "#414143",
        track: "#3d3d3d",
        ink: "#020202",
        accent: {
          DEFAULT: "#fa7319",
          soft: "#ff8a3d",
        },
        muted: {
          DEFAULT: "#b8b8b8",
          foreground: "#6b6b6b",
        },
        foreground: "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-roboto-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        mono: ["var(--font-roboto-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        space: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "8px",
        xl: "10px",
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }], // 11px
        xsm: "0.8125rem", // 13px
        title: "1.375rem", // 22px
        display: "2rem", // 32px
      },
      transitionTimingFunction: {
        micro: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        micro: "200ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
