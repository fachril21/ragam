import { describe, expect, it } from "vitest";
import { SENSITIVE_TABLES, evaluateRlsResults, type TableProbe } from "./rls-check.lib";

const probe = (table: string, rows: number, error?: string): TableProbe => ({ table, rows, error });

describe("evaluateRlsResults", () => {
  it("passes when sensitive tables return zero rows", () => {
    const report = evaluateRlsResults(SENSITIVE_TABLES.map((t) => probe(t, 0)));
    expect(report.ok).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("passes when sensitive tables are denied outright", () => {
    const report = evaluateRlsResults(
      SENSITIVE_TABLES.map((t) => probe(t, 0, "permission denied for table")),
    );
    expect(report.ok).toBe(true);
  });

  it("fails and names the table when a sensitive table leaks rows", () => {
    const report = evaluateRlsResults([probe("orders", 3), probe("payments", 0)]);
    expect(report.ok).toBe(false);
    expect(report.failures).toEqual([expect.stringContaining("orders")]);
  });

  it("does not treat unrelated errors (network, bad key) as a pass", () => {
    const report = evaluateRlsResults([probe("orders", 0, "fetch failed")]);
    expect(report.ok).toBe(false);
    expect(report.failures[0]).toMatch(/orders.*fetch failed/);
  });

  it("allows public catalog tables to return rows", () => {
    const report = evaluateRlsResults([probe("products", 20), probe("categories", 3)]);
    expect(report.ok).toBe(true);
  });

  it("covers every sensitive table named in the PRD", () => {
    expect(SENSITIVE_TABLES).toEqual(
      expect.arrayContaining(["orders", "order_items", "payments", "shipments", "admin_profiles"]),
    );
  });
});
