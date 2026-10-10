import { describe, expect, it, vi } from "vitest";
import { ShippingError } from "../integrations/rajaongkir/errors";
import { createShippingHandlers, type HandlerContext } from "./handlers";

const VARIANT = "3f2b8c1e-9d4a-4c6e-8f1a-2b7d5e9c0a11";

function ctx(over: Partial<HandlerContext> = {}) {
  const service = {
    searchDestinations: vi.fn(async () => ({ destinations: [{ id: "1" }], cached: false })),
    getRates: vi.fn(async () => ({ rates: [], chargeableGrams: 500, cached: true })),
    track: vi.fn(async () => ({ tracking: { awb: "R1" }, cached: false })),
    getQuotaStatus: vi.fn(),
  };
  const context: HandlerContext = {
    service: service as unknown as HandlerContext["service"],
    limiter: vi.fn(async () => true),
    lookupShipment: vi.fn(async () => ({ courier: "jne", awb: "R1", phoneLast5: "67890" })),
    ...over,
  };
  return { context, service };
}

const get = (url: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { headers });
const post = (body: unknown) =>
  new Request("http://localhost/api/shipping/rates", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("destinations", () => {
  it("returns destinations and rate-limits per IP at 10/min (E14)", async () => {
    const { context, service } = ctx();
    const res = await createShippingHandlers(context).destinations(
      get("/api/shipping/destinations?q=bandung", { "x-forwarded-for": "1.1.1.1" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ destinations: [{ id: "1" }], cached: false });
    expect(service.searchDestinations).toHaveBeenCalledWith("bandung");
    expect(context.limiter).toHaveBeenCalledWith("shipping:destinations:1.1.1.1", 10, 60);
  });

  it("E3: rejects a missing or short q before spending anything", async () => {
    const { context, service } = ctx();
    const handlers = createShippingHandlers(context);
    for (const url of ["/api/shipping/destinations", "/api/shipping/destinations?q=ba"]) {
      const res = await handlers.destinations(get(url));
      expect(res.status).toBe(400);
    }
    expect(service.searchDestinations).not.toHaveBeenCalled();
  });

  it("answers 429 RATE_LIMITED without calling the service when over the limit", async () => {
    const { context, service } = ctx({ limiter: vi.fn(async () => false) });
    const res = await createShippingHandlers(context).destinations(
      get("/api/shipping/destinations?q=bandung"),
    );
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(service.searchDestinations).not.toHaveBeenCalled();
  });

  it("passes classified service errors through", async () => {
    const { context, service } = ctx();
    service.searchDestinations.mockRejectedValueOnce(new ShippingError("TIMEOUT", "lambat"));
    const res = await createShippingHandlers(context).destinations(
      get("/api/shipping/destinations?q=bandung"),
    );
    expect(res.status).toBe(504);
  });

  it("E1: reports a configuration error as 503", async () => {
    const { context, service } = ctx();
    service.searchDestinations.mockRejectedValueOnce(new ShippingError("CONFIG_ERROR", "belum"));
    const res = await createShippingHandlers(context).destinations(
      get("/api/shipping/destinations?q=bandung"),
    );
    expect(res.status).toBe(503);
  });
});

describe("rates", () => {
  const valid = { destinationId: "55", items: [{ variantId: VARIANT, quantity: 2 }] };

  it("calls the service with validated input only (E10)", async () => {
    const { context, service } = ctx();
    const res = await createShippingHandlers(context).rates(
      post({ ...valid, weight: 1, price: 1, items: [{ ...valid.items[0], weightGrams: 1 }] }),
    );
    expect(res.status).toBe(200);
    expect(service.getRates).toHaveBeenCalledWith({
      destinationId: "55",
      items: [{ variantId: VARIANT, quantity: 2 }],
      courier: undefined,
    });
  });

  it.each([
    ["not json", "{oops"],
    ["no items", { destinationId: "55", items: [] }],
    ["bad quantity", { destinationId: "55", items: [{ variantId: VARIANT, quantity: 0 }] }],
    [
      "fractional quantity",
      { destinationId: "55", items: [{ variantId: VARIANT, quantity: 1.5 }] },
    ],
    ["bad variant id", { destinationId: "55", items: [{ variantId: "nope", quantity: 1 }] }],
    ["missing destination", { items: valid.items }],
    ["huge cart", { destinationId: "55", items: Array(60).fill(valid.items[0]) }],
  ])("E9: rejects %s with 400", async (_name, body) => {
    const { context, service } = ctx();
    const res = await createShippingHandlers(context).rates(post(body));
    expect(res.status).toBe(400);
    expect(service.getRates).not.toHaveBeenCalled();
  });

  it("rate limits at 20/min per IP", async () => {
    const { context } = ctx();
    await createShippingHandlers(context).rates(post(valid));
    expect(context.limiter).toHaveBeenCalledWith("shipping:rates:9.9.9.9", 20, 60);
  });
});

describe("track", () => {
  it("returns tracking for a verified order and phone, reading courier/awb from the database", async () => {
    const { context, service } = ctx();
    const res = await createShippingHandlers(context).track(
      get("/api/shipping/track?order=TKO-1&phone=081234567890&awb=EVIL&courier=evil"),
    );
    expect(res.status).toBe(200);
    expect(service.track).toHaveBeenCalledWith({ courier: "jne", awb: "R1", phoneLast5: "67890" });
    expect(await res.json()).toMatchObject({ tracking: { awb: "R1" } });
  });

  it("E19: unknown order and wrong phone both give the same generic 404", async () => {
    const { context, service } = ctx({ lookupShipment: vi.fn(async () => null) });
    const res = await createShippingHandlers(context).track(
      get("/api/shipping/track?order=TKO-1&phone=0811"),
    );
    expect(res.status).toBe(404);
    expect(service.track).not.toHaveBeenCalled();
  });

  it("E20: no waybill yet means no upstream call and a friendly empty result", async () => {
    const { context, service } = ctx({
      lookupShipment: vi.fn(async () => ({ courier: "jne", awb: "", phoneLast5: "67890" })),
    });
    const res = await createShippingHandlers(context).track(
      get("/api/shipping/track?order=TKO-1&phone=081234567890"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracking: null, reason: "NO_WAYBILL" });
    expect(service.track).not.toHaveBeenCalled();
  });

  it("E21: an unknown waybill degrades to the fallback payload", async () => {
    const { context, service } = ctx();
    service.track.mockRejectedValueOnce(new ShippingError("NOT_FOUND", "x"));
    const res = await createShippingHandlers(context).track(
      get("/api/shipping/track?order=TKO-1&phone=081234567890"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tracking: null,
      reason: "NOT_FOUND",
      fallback: { courier: "jne", awb: "R1" },
    });
  });

  it("rejects missing params with 400 and rate limits at 10/min", async () => {
    const { context } = ctx();
    const handlers = createShippingHandlers(context);
    expect((await handlers.track(get("/api/shipping/track"))).status).toBe(400);
    await handlers.track(
      get("/api/shipping/track?order=A&phone=1", { "x-forwarded-for": "2.2.2.2" }),
    );
    expect(context.limiter).toHaveBeenCalledWith("shipping:track:2.2.2.2", 10, 60);
  });
});
