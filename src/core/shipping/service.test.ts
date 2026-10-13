import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShippingError } from "../integrations/rajaongkir/errors";
import type { DestinationOption, ShippingRate } from "../integrations/rajaongkir/types";
import { createShippingService, type ShippingDeps } from "./service";

const dest = (id: string): DestinationOption => ({
  id,
  label: `L${id}`,
  province: "P",
  city: "C",
  district: "D",
  subdistrict: "S",
  zipCode: "1",
});

const rate = (
  courier: string,
  service: string,
  cost: number,
  etd: string | null = "1 day",
): ShippingRate => ({
  courier,
  courierName: courier.toUpperCase(),
  service,
  description: service,
  cost,
  etd,
});

function memoryDeps(over: Partial<ShippingDeps> = {}) {
  const store = new Map<string, unknown>();
  let usage = 0;
  const client = {
    searchDestination: vi.fn(async () => [dest("1")]),
    calculateCost: vi.fn(async () => [
      rate("jne", "REG", 13000),
      rate("sicepat", "REG", 11000),
      rate("jne", "JTR", 45000),
      rate("pos", "PAKETPOS DANGEROUS GOODS", 15000),
      rate("jnt", "EZ", 36000, null),
    ]),
    trackWaybill: vi.fn(async () => ({
      courier: "jne",
      awb: "A1",
      status: "ON PROCESS",
      delivered: false,
      history: [],
    })),
  };
  const deps: ShippingDeps = {
    client,
    cache: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, _kind, payload: unknown) => void store.set(key, payload)),
    },
    usage: {
      record: vi.fn(async () => ++usage),
      today: vi.fn(async () => usage),
    },
    settings: vi.fn(async () => ({
      originDestinationId: "100",
      activeCouriers: ["jne", "jnt", "sicepat", "pos"],
      apiDailyLimit: 100,
    })),
    variants: vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, weightGrams: 300, isActive: true, stock: 5 })),
    ),
    warn: vi.fn(),
    ...over,
  };
  return { deps, client, store, setUsage: (n: number) => (usage = n) };
}

describe("searchDestinations", () => {
  it("E4: serves a differently-cased repeat from cache with one upstream hit", async () => {
    const { deps, client } = memoryDeps();
    const service = createShippingService(deps);
    await service.searchDestinations("Bandung");
    const second = await service.searchDestinations("  bandung ");
    expect(client.searchDestination).toHaveBeenCalledTimes(1);
    expect(second.cached).toBe(true);
  });

  it("E3: rejects short queries without touching cache, usage or upstream", async () => {
    const { deps, client } = memoryDeps();
    await expect(createShippingService(deps).searchDestinations("ba ")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(client.searchDestination).not.toHaveBeenCalled();
    expect(deps.usage.record).not.toHaveBeenCalled();
  });
});

describe("getRates", () => {
  const items = [{ variantId: "v1", quantity: 2 }];
  let ctx: ReturnType<typeof memoryDeps>;
  beforeEach(() => {
    ctx = memoryDeps();
  });

  it("computes weight on the server, rounds to 500 g and asks for every courier once (D3, D5)", async () => {
    const result = await createShippingService(ctx.deps).getRates({ destinationId: "55", items });
    expect(ctx.client.calculateCost).toHaveBeenCalledWith({
      origin: "100",
      destination: "55",
      weightGrams: 1000,
      couriers: ["jne", "jnt", "sicepat", "pos"],
    });
    expect(result.chargeableGrams).toBe(1000);
  });

  it("E12: drops cargo/special services, sorts by price and flags the cheapest", async () => {
    const { rates } = await createShippingService(ctx.deps).getRates({
      destinationId: "55",
      items,
    });
    expect(rates.map((r) => `${r.courier}/${r.service}`)).toEqual([
      "sicepat/REG",
      "jne/REG",
      "jnt/EZ",
    ]);
    expect(rates.map((r) => r.isCheapest)).toEqual([true, false, false]);
  });

  it("E13: keeps a missing estimate as null", async () => {
    const { rates } = await createShippingService(ctx.deps).getRates({
      destinationId: "55",
      items,
    });
    expect(rates.find((r) => r.courier === "jnt")?.etd).toBeNull();
  });

  it("E14/E16: identical requests cost one upstream hit", async () => {
    const service = createShippingService(ctx.deps);
    for (let i = 0; i < 10; i++) await service.getRates({ destinationId: "55", items });
    expect(ctx.client.calculateCost).toHaveBeenCalledTimes(1);
    const again = await service.getRates({ destinationId: "55", items });
    expect(again.cached).toBe(true);
  });

  it("E11: changing active couriers re-filters the cache without a new hit", async () => {
    const service = createShippingService(ctx.deps);
    await service.getRates({ destinationId: "55", items });
    (ctx.deps.settings as ReturnType<typeof vi.fn>).mockResolvedValue({
      originDestinationId: "100",
      activeCouriers: ["jne"],
      apiDailyLimit: 100,
    });
    const { rates } = await service.getRates({ destinationId: "55", items });
    expect(ctx.client.calculateCost).toHaveBeenCalledTimes(1);
    expect(rates.every((r) => r.courier === "jne")).toBe(true);
  });

  it("E11: rejects a requested courier that is not active", async () => {
    await expect(
      createShippingService(ctx.deps).getRates({ destinationId: "55", items, courier: "tiki" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("E2: reports a configuration error when the origin is missing", async () => {
    (ctx.deps.settings as ReturnType<typeof vi.fn>).mockResolvedValue({
      originDestinationId: null,
      activeCouriers: ["jne"],
      apiDailyLimit: 100,
    });
    await expect(
      createShippingService(ctx.deps).getRates({ destinationId: "55", items }),
    ).rejects.toMatchObject({ code: "CONFIG_ERROR" });
  });

  it("E9/E10: ignores client weight and rejects unknown, inactive or empty carts", async () => {
    const service = createShippingService(ctx.deps);
    await expect(service.getRates({ destinationId: "55", items: [] })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    (ctx.deps.variants as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    await expect(service.getRates({ destinationId: "55", items })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    (ctx.deps.variants as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "v1", weightGrams: 300, isActive: false, stock: 5 },
    ]);
    await expect(service.getRates({ destinationId: "55", items })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    const sneaky = {
      destinationId: "55",
      items: [{ variantId: "v1", quantity: 1, weightGrams: 1 }],
    };
    await service.getRates(sneaky as never);
    expect(ctx.client.calculateCost).toHaveBeenLastCalledWith(
      expect.objectContaining({ weightGrams: 500 }),
    );
  });

  it("E9: rejects carts heavier than 20 kg", async () => {
    (ctx.deps.variants as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "v1", weightGrams: 15_000, isActive: true, stock: 5 },
    ]);
    await expect(
      createShippingService(ctx.deps).getRates({ destinationId: "55", items }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("E8: caches an empty result for a short time", async () => {
    ctx.client.calculateCost.mockResolvedValueOnce([]);
    const service = createShippingService(ctx.deps);
    const first = await service.getRates({ destinationId: "55", items });
    expect(first.rates).toEqual([]);
    expect(ctx.deps.cache.set).toHaveBeenCalledWith(
      "rates:100:55:1000",
      "rates",
      expect.anything(),
      300,
    );
  });
});

describe("quota (E17, E18)", () => {
  const items = [{ variantId: "v1", quantity: 1 }];

  it("E18: blocks upstream calls locally once the daily limit is reached", async () => {
    const ctx = memoryDeps();
    ctx.setUsage(100);
    await expect(
      createShippingService(ctx.deps).getRates({ destinationId: "55", items }),
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(ctx.client.calculateCost).not.toHaveBeenCalled();
  });

  it("E18: cached answers are still served after the quota is exhausted", async () => {
    const ctx = memoryDeps();
    const service = createShippingService(ctx.deps);
    await service.getRates({ destinationId: "55", items });
    ctx.setUsage(100);
    const again = await service.getRates({ destinationId: "55", items });
    expect(again.cached).toBe(true);
  });

  it("E17: warns once when usage crosses 80% and getQuotaStatus reports it", async () => {
    const ctx = memoryDeps({
      settings: vi.fn(async () => ({
        originDestinationId: "100",
        activeCouriers: ["jne"],
        apiDailyLimit: 5,
      })),
    });
    const service = createShippingService(ctx.deps);
    ctx.setUsage(2);
    await service.searchDestinations("aaa"); // total 3 -> 60%
    expect(ctx.deps.warn).not.toHaveBeenCalled();
    await service.searchDestinations("bbb"); // total 4 -> 80%
    expect(ctx.deps.warn).toHaveBeenCalledTimes(1);
    await service.searchDestinations("ccc"); // total 5 -> already warned
    expect(ctx.deps.warn).toHaveBeenCalledTimes(1);
    expect(await service.getQuotaStatus()).toEqual({
      used: 5,
      limit: 5,
      percent: 100,
      warning: true,
      exhausted: true,
    });
  });

  it("E5-E7: failed upstream calls are recorded as failures", async () => {
    const ctx = memoryDeps();
    ctx.client.searchDestination.mockRejectedValueOnce(new ShippingError("UPSTREAM_ERROR", "x"));
    await expect(createShippingService(ctx.deps).searchDestinations("abc")).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
    });
    expect(ctx.deps.usage.record).toHaveBeenCalledWith("destinations", true);
    expect(ctx.deps.cache.set).not.toHaveBeenCalled();
  });
});

describe("tracking (E19-E23)", () => {
  it("E22: fetches once and serves the repeat from cache", async () => {
    const ctx = memoryDeps();
    const service = createShippingService(ctx.deps);
    await service.track({ courier: "jne", awb: "A1", phoneLast5: "12345" });
    const again = await service.track({ courier: "jne", awb: "A1", phoneLast5: "12345" });
    expect(ctx.client.trackWaybill).toHaveBeenCalledTimes(1);
    expect(again.cached).toBe(true);
  });

  it("E20: an empty tracking number never reaches upstream", async () => {
    const ctx = memoryDeps();
    await expect(
      createShippingService(ctx.deps).track({ courier: "jne", awb: "  ", phoneLast5: "" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(ctx.client.trackWaybill).not.toHaveBeenCalled();
  });
});
