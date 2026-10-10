import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findShipment, normalizePhone } from "./tracking";

describe("normalizePhone", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["(0812) 3456 7890", "6281234567890"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("returns an empty string for junk", () => {
    expect(normalizePhone("abc")).toBe("");
  });
});

function client(data: unknown, error: { message: string } | null = null) {
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "eq", "limit"]) chain[op] = () => chain;
  chain.maybeSingle = async () => ({ data, error });
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

const order = (over: Record<string, unknown> = {}) => ({
  phone: "081234567890",
  shipments: [{ courier: "jne", tracking_number: "RESI123" }],
  ...over,
});

describe("findShipment (E19, E20, E23)", () => {
  it("returns courier and awb from the database for a matching order and phone", async () => {
    const result = await findShipment(client(order()), "TKO-1", "+62 812-3456-7890");
    expect(result).toEqual({ courier: "jne", awb: "RESI123", phoneLast5: "67890" });
  });

  it("E19: a wrong phone looks exactly like an unknown order", async () => {
    expect(await findShipment(client(order()), "TKO-1", "081111111111")).toBeNull();
    expect(await findShipment(client(null), "TKO-1", "081234567890")).toBeNull();
  });

  it("E19: empty inputs never query the database", async () => {
    const sb = client(order());
    expect(await findShipment(sb, "", "081234567890")).toBeNull();
    expect(await findShipment(sb, "TKO-1", "")).toBeNull();
    expect((sb.from as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("E20: an order without a tracking number yields an empty awb", async () => {
    const result = await findShipment(
      client(order({ shipments: [{ courier: "jne", tracking_number: null }] })),
      "TKO-1",
      "081234567890",
    );
    expect(result).toEqual({ courier: "jne", awb: "", phoneLast5: "67890" });
  });

  it("E20: an order without any shipment yields no awb either", async () => {
    const result = await findShipment(client(order({ shipments: [] })), "TKO-1", "081234567890");
    expect(result).toEqual({ courier: "", awb: "", phoneLast5: "67890" });
  });

  it("propagates database errors", async () => {
    await expect(
      findShipment(client(null, { message: "boom" }), "TKO-1", "081234567890"),
    ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });
});
