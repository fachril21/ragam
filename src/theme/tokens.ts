/**
 * Design tokens. Change values here (or in store.config.ts) to re-skin the whole shop;
 * components only read the CSS variables generated from this object.
 */
export const tokens = {
  color: {
    background: "#ffffff",
    surface: "#f5f5f5",
    border: "#e0e0e0",
    text: "#141414",
    textMuted: "#595959",
    primary: "#141414",
    onPrimary: "#ffffff",
    accent: "#c8102e",
    onAccent: "#ffffff",
    success: "#1b7f3b",
    warning: "#8a5a00",
    error: "#b3261e",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e8e8e8",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#595959",
    700: "#404040",
    800: "#262626",
    900: "#141414",
  },
  font: {
    sans: "var(--font-sans-family), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  radius: { sm: "2px", md: "4px", lg: "8px" },
  spacing: { page: "1rem", section: "4rem" },
  shadow: {
    card: "0 1px 2px rgb(0 0 0 / 0.06), 0 4px 12px rgb(0 0 0 / 0.04)",
    overlay: "0 8px 32px rgb(0 0 0 / 0.16)",
  },
} as const;

export type Tokens = typeof tokens;

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Flattens tokens into CSS custom properties for injection on :root. */
export function tokensToCssVariables(t: Tokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, value] of Object.entries(t.color)) vars[`--color-${kebab(name)}`] = value;
  for (const [step, value] of Object.entries(t.neutral)) vars[`--color-neutral-${step}`] = value;
  for (const [name, value] of Object.entries(t.radius)) vars[`--radius-${name}`] = value;
  for (const [name, value] of Object.entries(t.spacing)) vars[`--space-${name}`] = value;
  for (const [name, value] of Object.entries(t.shadow)) vars[`--shadow-${name}`] = value;
  vars["--font-sans"] = t.font.sans;
  return vars;
}
