import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { tokens } from "./tokens";

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#123456", "#fedcba")).toBeCloseTo(contrastRatio("#fedcba", "#123456"), 8);
  });

  it("accepts 3-digit hex", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 1);
  });

  it("throws on invalid color", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow(/hex/i);
  });
});

describe("default theme tokens meet WCAG 2.1 AA (4.5:1)", () => {
  const { color } = tokens;
  const pairs: Array<[string, string, string]> = [
    ["body text on background", color.text, color.background],
    ["muted text on background", color.textMuted, color.background],
    ["primary button label on primary", color.onPrimary, color.primary],
    ["accent button label on accent", color.onAccent, color.accent],
    ["success text on background", color.success, color.background],
    ["warning text on background", color.warning, color.background],
    ["error text on background", color.error, color.background],
    ["muted text on subtle surface", color.textMuted, color.surface],
  ];

  it.each(pairs)("%s", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
