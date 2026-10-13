import { describe, expect, it } from "vitest";
import { chargeableWeight, normalizeQuery, ratesCacheKey, totalWeight } from "./weight";

describe("chargeableWeight (D5)", () => {
  it.each([
    [1, 500],
    [200, 500],
    [500, 500],
    [501, 1000],
    [1000, 1000],
    [1001, 1500],
    [19_999, 20_000],
    [20_000, 20_000],
  ])("rounds %d g up to %d g", (grams, expected) => {
    expect(chargeableWeight(grams)).toBe(expected);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 20_001, 1.5])("E9: rejects %s", (grams) => {
    expect(() => chargeableWeight(grams)).toThrow(/berat/i);
  });
});

describe("totalWeight", () => {
  it("sums weight x quantity", () => {
    expect(
      totalWeight([
        { weightGrams: 200, quantity: 2 },
        { weightGrams: 350, quantity: 1 },
      ]),
    ).toBe(750);
  });

  it.each([0, -1, 1.5])("E9: rejects quantity %s", (quantity) => {
    expect(() => totalWeight([{ weightGrams: 200, quantity }])).toThrow(/jumlah/i);
  });

  it("E9: rejects an empty list", () => {
    expect(() => totalWeight([])).toThrow(/item/i);
  });
});

describe("cache keys", () => {
  it("E4: normalizes queries (case and whitespace)", () => {
    expect(normalizeQuery("  Bandung  Kidul ")).toBe("bandung kidul");
    expect(normalizeQuery("BANDUNG")).toBe(normalizeQuery("bandung"));
  });

  it("builds a stable rates key independent of courier order", () => {
    const a = ratesCacheKey({ origin: "1", destination: "2", chargeableGrams: 1000 });
    const b = ratesCacheKey({ origin: "1", destination: "2", chargeableGrams: 1000 });
    expect(a).toBe(b);
    expect(a).not.toBe(ratesCacheKey({ origin: "1", destination: "2", chargeableGrams: 1500 }));
    expect(a).not.toBe(ratesCacheKey({ origin: "2", destination: "1", chargeableGrams: 1000 }));
  });
});
