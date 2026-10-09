import { describe, expect, it } from "vitest";
import { tokens, tokensToCssVariables } from "./tokens";

describe("tokensToCssVariables", () => {
  const vars = tokensToCssVariables(tokens);

  it("maps every color token to a --color-* variable", () => {
    expect(vars["--color-primary"]).toBe(tokens.color.primary);
    expect(vars["--color-text-muted"]).toBe(tokens.color.textMuted);
  });

  it("exposes the neutral scale 50-900", () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      expect(vars[`--color-neutral-${step}`]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("maps radius and shadow tokens", () => {
    expect(vars["--radius-md"]).toBe(tokens.radius.md);
    expect(vars["--shadow-card"]).toBe(tokens.shadow.card);
  });

  it("does not include undefined values", () => {
    expect(Object.values(vars).every((v) => typeof v === "string" && v.length > 0)).toBe(true);
  });
});
