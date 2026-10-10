import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokens, tokensToCssVariables } from "./tokens";

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
const themeBlock = /@theme\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? "";

describe("globals.css @theme stays in sync with tokens.ts", () => {
  const vars = tokensToCssVariables(tokens);
  // --space-* is not a Tailwind theme namespace, so it is only set at runtime.
  const registered = Object.keys(vars).filter((name) => !name.startsWith("--space-"));

  it.each(registered)("declares %s so Tailwind utilities can reference it", (name) => {
    expect(themeBlock).toContain(`${name}:`);
  });

  it("does not declare theme variables that tokens.ts no longer provides", () => {
    const declared = [...themeBlock.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    const unknown = declared.filter((name) => !(name in vars));
    expect(unknown).toEqual([]);
  });
});
