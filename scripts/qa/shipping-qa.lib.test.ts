import { describe, expect, it } from "vitest";
import { evaluateCacheRun, findLeakedSecrets } from "./shipping-qa.lib";

describe("evaluateCacheRun (E4-AC2)", () => {
  it("passes when 10 identical requests cost at most one upstream call", () => {
    expect(evaluateCacheRun({ requests: 10, usageBefore: 4, usageAfter: 5 }).ok).toBe(true);
    expect(evaluateCacheRun({ requests: 10, usageBefore: 4, usageAfter: 4 }).ok).toBe(true);
  });

  it("fails when the cache did not absorb the repeats", () => {
    const report = evaluateCacheRun({ requests: 10, usageBefore: 4, usageAfter: 14 });
    expect(report.ok).toBe(false);
    expect(report.message).toMatch(/10 upstream/);
  });

  it("fails on a decreasing counter, which means the probe is not trustworthy", () => {
    expect(evaluateCacheRun({ requests: 10, usageBefore: 9, usageAfter: 3 }).ok).toBe(false);
  });
});

describe("findLeakedSecrets (E4-AC6)", () => {
  const files = [
    { path: "static/chunks/a.js", content: "var x='hello world';" },
    { path: "static/chunks/b.js", content: "fetch('/api',{headers:{key:'abcd1234efgh5678'}})" },
  ];

  it("reports the name and file of a secret embedded in a client file", () => {
    const leaks = findLeakedSecrets(files, [
      { name: "RAJAONGKIR_API_KEY", value: "abcd1234efgh5678" },
    ]);
    expect(leaks).toEqual([{ name: "RAJAONGKIR_API_KEY", path: "static/chunks/b.js" }]);
  });

  it("returns nothing when the bundle is clean", () => {
    expect(
      findLeakedSecrets(files, [{ name: "DUITKU_API_KEY", value: "zzzzzzzzzzzzzzzz" }]),
    ).toEqual([]);
  });

  it("ignores empty or very short values so they cannot cause false positives", () => {
    expect(
      findLeakedSecrets(files, [
        { name: "EMPTY", value: "" },
        { name: "SHORT", value: "hello" },
      ]),
    ).toEqual([]);
  });

  it("never includes the secret value in its output", () => {
    const leaks = findLeakedSecrets(files, [{ name: "K", value: "abcd1234efgh5678" }]);
    expect(JSON.stringify(leaks)).not.toContain("abcd1234efgh5678");
  });
});
