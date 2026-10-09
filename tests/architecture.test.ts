import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = join(__dirname, "..", "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sources = walk(srcDir).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const read = (f: string) => readFileSync(f, "utf8");
const rel = (f: string) => relative(srcDir, f).replace(/\\/g, "/");

describe("architecture boundaries", () => {
  it("src/core never imports from src/custom", () => {
    const offenders = sources
      .filter((f) => rel(f).startsWith("core/"))
      .filter((f) => /from\s+["'](@\/custom|\.\.?\/.*custom)/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("client components never import the service-role client", () => {
    const offenders = sources
      .filter((f) => /^\s*["']use client["']/.test(read(f)))
      .filter((f) => /supabase\/server|SUPABASE_SERVICE_ROLE_KEY/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("the service-role client module is marked server-only", () => {
    expect(read(join(srcDir, "core", "supabase", "server.ts"))).toMatch(
      /import\s+["']server-only["']/,
    );
  });

  it("server env is only read in server-only modules", () => {
    const offenders = sources
      .filter((f) => /parseServerEnv|getServerEnv/.test(read(f)))
      .filter((f) => !/import\s+["']server-only["']/.test(read(f)))
      .filter((f) => rel(f) !== "core/env.ts")
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("components do not call Supabase directly (use src/core/data)", () => {
    const offenders = sources
      .filter((f) => rel(f).startsWith("components/") || rel(f).startsWith("app/"))
      .filter((f) => /@supabase\/supabase-js|core\/supabase\//.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
