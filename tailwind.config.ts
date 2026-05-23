import type { Config } from "tailwindcss";

// Themeable palette — values come from CSS custom properties in src/index.css.
// The channel-triple form keeps Tailwind's /opacity modifiers working
// (e.g. bg-mauve/15 → rgb(var(--c-mauve) / 0.15)). Mirrors the desktop
// suite's tailwind.config.ts (ndisc / ndisc.blobtree / ndisc.smpl).
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("--c-bg"),
        surface: c("--c-surface"),
        surfaceHover: c("--c-surface-hover"),
        fg: c("--c-fg"),
        muted: c("--c-muted"),
        accent: c("--c-accent"),
        mauve: c("--c-mauve"),
        // Medium badges — physical green, digital blue.
        physical: c("--c-physical"),
        digital: c("--c-digital"),
      },
      fontFamily: {
        sans: ["Helvetica", "Arial", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
