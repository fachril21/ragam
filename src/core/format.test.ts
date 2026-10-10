import { describe, expect, it } from "vitest";
import { formatRupiah } from "./format";

describe("formatRupiah", () => {
  it("formats with Indonesian thousand separators and no space after Rp", () => {
    expect(formatRupiah(1250000)).toBe("Rp1.250.000");
  });

  it("formats zero", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("formats values below one thousand without separator", () => {
    expect(formatRupiah(999)).toBe("Rp999");
  });

  it("rejects non-integer amounts because prices are whole rupiah", () => {
    expect(() => formatRupiah(10.5)).toThrow(/integer/i);
  });

  it("rejects negative amounts", () => {
    expect(() => formatRupiah(-1)).toThrow(/negative/i);
  });
});
