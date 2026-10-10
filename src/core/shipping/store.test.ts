import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeRateLimit, createShippingStore } from "./store";

type Result = { data: unknown; error: { message: string } | null };

/** Minimal chainable stand-in for the Supabase query builder. */
function fakeClient(results: Record<string, Result>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
  const builder = (table: string) => {
    const result = () => results[table] ?? { data: null, error: null };
    const chain: Record<string, unknown> = {};
    for (const op of ["select", "eq", "in", "limit", "upsert"]) {
      chain[op] = (...args: unknown[]) => {
        calls.push({ table, op, args });
        return chain;
      };
    }
    chain.maybeSingle = async () => result();
    chain.single = async () => result();
    chain.then = (resolve: (r: Result) => unknown) => resolve(result());
    return chain;
  };
  const client = {
    from: vi.fn(builder),
    rpc: vi.fn(async (fn: string) => results[`rpc:${fn}`] ?? { data: null, error: null }),
  };
  return { client: client as unknown as SupabaseClient, calls, raw: client };
}

const NOW = new Date("2026-10-10T10:00:00Z");

describe("cache", () => {
  it("returns the payload while fresh", async () => {
    const { client } = fakeClient({
      shipping_cache: {
        data: { payload: { a: 1 }, expires_at: "2026-10-10T10:30:00Z" },
        error: null,
      },
    });
    expect(await createShippingStore(client, () => NOW).cache.get("k")).toEqual({ a: 1 });
  });

  it("E16: treats a row at or past expires_at as a miss", async () => {
    const { client } = fakeClient({
      shipping_cache: {
        data: { payload: { a: 1 }, expires_at: "2026-10-10T10:00:00Z" },
        error: null,
      },
    });
    expect(await createShippingStore(client, () => NOW).cache.get("k")).toBeNull();
  });

  it("returns null when there is no row", async () => {
    const { client } = fakeClient({ shipping_cache: { data: null, error: null } });
    expect(await createShippingStore(client, () => NOW).cache.get("k")).toBeNull();
  });

  it("surfaces database errors as UPSTREAM_ERROR instead of hiding them", async () => {
    const { client } = fakeClient({ shipping_cache: { data: null, error: { message: "boom" } } });
    await expect(createShippingStore(client, () => NOW).cache.get("k")).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
    });
  });

  it("E15: writes with an upsert on the key and a computed expiry", async () => {
    const { client, calls } = fakeClient({ shipping_cache: { data: null, error: null } });
    await createShippingStore(client, () => NOW).cache.set("k", "rates", { a: 1 }, 1800);
    const upsert = calls.find((c) => c.op === "upsert");
    expect(upsert?.args[0]).toEqual({
      key: "k",
      kind: "rates",
      payload: { a: 1 },
      expires_at: "2026-10-10T10:30:00.000Z",
    });
    expect(upsert?.args[1]).toEqual({ onConflict: "key" });
  });
});

describe("usage", () => {
  it("record() returns the provider total from the RPC", async () => {
    const { client, raw } = fakeClient({ "rpc:increment_api_usage": { data: 7, error: null } });
    expect(await createShippingStore(client, () => NOW).usage.record("cost", true)).toBe(7);
    expect(raw.rpc).toHaveBeenCalledWith("increment_api_usage", {
      p_provider: "rajaongkir",
      p_endpoint: "cost",
      p_failed: true,
    });
  });

  it("today() sums the day's rows", async () => {
    const { client } = fakeClient({
      api_usage: { data: [{ calls: 3 }, { calls: 4 }], error: null },
    });
    expect(await createShippingStore(client, () => NOW).usage.today()).toBe(7);
  });
});

describe("settings and variants", () => {
  it("maps store_settings to camelCase", async () => {
    const { client } = fakeClient({
      store_settings: {
        data: { origin_destination_id: "100", active_couriers: ["jne"], api_daily_limit: 100 },
        error: null,
      },
    });
    expect(await createShippingStore(client, () => NOW).settings()).toEqual({
      originDestinationId: "100",
      activeCouriers: ["jne"],
      apiDailyLimit: 100,
    });
  });

  it("falls back to the default limit when settings are missing", async () => {
    const { client } = fakeClient({ store_settings: { data: null, error: null } });
    expect(await createShippingStore(client, () => NOW).settings()).toEqual({
      originDestinationId: null,
      activeCouriers: [],
      apiDailyLimit: 100,
    });
  });

  it("maps variants and the product's active flag", async () => {
    const { client } = fakeClient({
      product_variants: {
        data: [{ id: "v1", weight_grams: 250, stock: 3, products: { is_active: true } }],
        error: null,
      },
    });
    expect(await createShippingStore(client, () => NOW).variants(["v1"])).toEqual([
      { id: "v1", weightGrams: 250, isActive: true, stock: 3 },
    ]);
  });

  it("returns no variants for an empty id list without querying", async () => {
    const { client, raw } = fakeClient({});
    expect(await createShippingStore(client, () => NOW).variants([])).toEqual([]);
    expect(raw.from).not.toHaveBeenCalled();
  });
});

describe("consumeRateLimit (E14)", () => {
  it("returns the RPC verdict", async () => {
    const allowed = fakeClient({ "rpc:consume_rate_limit": { data: true, error: null } });
    expect(await consumeRateLimit(allowed.client, "ip:1", 10, 60)).toBe(true);
    const blocked = fakeClient({ "rpc:consume_rate_limit": { data: false, error: null } });
    expect(await consumeRateLimit(blocked.client, "ip:1", 10, 60)).toBe(false);
  });

  it("fails open when the limiter itself errors, so a DB blip does not take checkout down", async () => {
    const { client } = fakeClient({
      "rpc:consume_rate_limit": { data: null, error: { message: "x" } },
    });
    expect(await consumeRateLimit(client, "ip:1", 10, 60)).toBe(true);
  });
});
