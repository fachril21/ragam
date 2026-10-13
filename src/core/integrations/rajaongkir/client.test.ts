import { describe, expect, it, vi } from "vitest";
import { createRajaOngkirClient } from "./client";
import { ShippingError } from "./errors";

const BASE = "https://rajaongkir.komerce.id/api/v1/";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function make(fetchImpl: typeof fetch, extra: Record<string, unknown> = {}) {
  return createRajaOngkirClient({
    apiKey: "test-key",
    baseUrl: BASE,
    fetch: fetchImpl,
    timeoutMs: 50,
    retryDelayMs: 0,
    ...extra,
  });
}

const destination = {
  id: 4816,
  label: "-, BANDUNG, BANDUNG, JAWA BARAT, 40614",
  province_name: "JAWA BARAT",
  city_name: "BANDUNG",
  district_name: "BANDUNG",
  subdistrict_name: "-",
  zip_code: "40614",
};

const rateRow = (over: Record<string, unknown> = {}) => ({
  name: "Jalur Nugraha Ekakurir (JNE)",
  code: "jne",
  service: "REG",
  description: "Layanan Reguler",
  cost: 13000,
  etd: "1 day",
  ...over,
});

describe("searchDestination", () => {
  it("normalizes destinations and sends the key header", async () => {
    const fetchMock = vi.fn(async () => json({ meta: { code: 200 }, data: [destination] }));
    const result = await make(fetchMock as unknown as typeof fetch).searchDestination("bandung");
    expect(result).toEqual([
      {
        id: "4816",
        label: destination.label,
        province: "JAWA BARAT",
        city: "BANDUNG",
        district: "BANDUNG",
        subdistrict: "-",
        zipCode: "40614",
      },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("destination/domestic-destination");
    expect(String(url)).toContain("search=bandung");
    expect((init.headers as Record<string, string>).key).toBe("test-key");
  });

  it("E3: rejects short queries without calling upstream (INVALID_INPUT)", async () => {
    const fetchMock = vi.fn();
    await expect(
      make(fetchMock as unknown as typeof fetch).searchDestination("ba"),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("calculateCost", () => {
  it("normalizes rates and sends a form-encoded body", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        meta: { code: 200 },
        data: [rateRow(), rateRow({ code: "jnt", service: "EZ", etd: "" })],
      }),
    );
    const rates = await make(fetchMock as unknown as typeof fetch).calculateCost({
      origin: "4816",
      destination: "17549",
      weightGrams: 1000,
      couriers: ["jne", "jnt"],
    });
    expect(rates).toEqual([
      {
        courier: "jne",
        courierName: "Jalur Nugraha Ekakurir (JNE)",
        service: "REG",
        description: "Layanan Reguler",
        cost: 13000,
        etd: "1 day",
      },
      {
        courier: "jnt",
        courierName: "Jalur Nugraha Ekakurir (JNE)",
        service: "EZ",
        description: "Layanan Reguler",
        cost: 13000,
        etd: null,
      },
    ]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(String(init.body));
    expect(body.get("origin")).toBe("4816");
    expect(body.get("destination")).toBe("17549");
    expect(body.get("weight")).toBe("1000");
    expect(body.get("courier")).toBe("jne:jnt");
  });

  it.each([0, -5, Number.NaN, 20_001])("E9: rejects weight %s", async (weightGrams) => {
    const fetchMock = vi.fn();
    await expect(
      make(fetchMock as unknown as typeof fetch).calculateCost({
        origin: "1",
        destination: "2",
        weightGrams,
        couriers: ["jne"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("E8: returns an empty list when upstream has no services", async () => {
    const fetchMock = vi.fn(async () => json({ meta: { code: 200 }, data: [] }));
    const rates = await make(fetchMock as unknown as typeof fetch).calculateCost({
      origin: "1",
      destination: "2",
      weightGrams: 500,
      couriers: ["jne"],
    });
    expect(rates).toEqual([]);
  });
});

describe("error classification", () => {
  const call = (client: ReturnType<typeof make>) => client.searchDestination("bandung");

  it("E5: aborts after the timeout and retries once (TIMEOUT)", async () => {
    const fetchMock = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expect(call(make(fetchMock as unknown as typeof fetch))).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a transient network failure once and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(json({ meta: { code: 200 }, data: [destination] }));
    const result = await call(make(fetchMock as unknown as typeof fetch));
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("E6: maps 429 to QUOTA_EXCEEDED without retrying", async () => {
    const fetchMock = vi.fn(async () =>
      json({ meta: { code: 429, message: "limit" }, data: null }, 429),
    );
    await expect(call(make(fetchMock as unknown as typeof fetch))).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("E7: maps 5xx to UPSTREAM_ERROR", async () => {
    const fetchMock = vi.fn(async () => json({ meta: { code: 500 }, data: null }, 500));
    await expect(call(make(fetchMock as unknown as typeof fetch))).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
    });
  });

  it("E7: maps a non-JSON body to UPSTREAM_ERROR", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>oops</html>", { status: 200 }));
    await expect(call(make(fetchMock as unknown as typeof fetch))).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
    });
  });

  it("E7: maps an unexpected payload shape to UPSTREAM_ERROR", async () => {
    const fetchMock = vi.fn(async () => json({ meta: { code: 200 }, data: [{ nope: true }] }));
    await expect(call(make(fetchMock as unknown as typeof fetch))).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
    });
  });

  it("an invalid API key (400) is an UPSTREAM_ERROR that does not leak the key", async () => {
    const fetchMock = vi.fn(async () =>
      json({ meta: { code: 400, message: "Invalid Api key, key not found" }, data: null }, 400),
    );
    const err = await call(make(fetchMock as unknown as typeof fetch)).catch((e) => e);
    expect(err).toBeInstanceOf(ShippingError);
    expect(err.code).toBe("UPSTREAM_ERROR");
    expect(JSON.stringify(err)).not.toContain("test-key");
    expect(err.message).not.toContain("test-key");
  });
});

describe("trackWaybill", () => {
  it("E21: maps 404 Invalid Awb to NOT_FOUND", async () => {
    const fetchMock = vi.fn(async () =>
      json({ meta: { code: 404, message: "Invalid Awb", status: "error" }, data: null }, 404),
    );
    await expect(
      make(fetchMock as unknown as typeof fetch).trackWaybill({
        courier: "jne",
        awb: "123",
        phoneLast5: "12345",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects an empty awb locally", async () => {
    const fetchMock = vi.fn();
    await expect(
      make(fetchMock as unknown as typeof fetch).trackWaybill({
        courier: "jne",
        awb: " ",
        phoneLast5: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes a tracking payload tolerantly", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        meta: { code: 200 },
        data: {
          delivered: false,
          summary: { courier_name: "JNE", waybill_number: "123", status: "ON PROCESS" },
          manifest: [
            {
              manifest_description: "Paket diterima",
              manifest_date: "2026-10-01",
              manifest_time: "10:00",
              city_name: "JAKARTA",
            },
          ],
        },
      }),
    );
    const result = await make(fetchMock as unknown as typeof fetch).trackWaybill({
      courier: "jne",
      awb: "123",
      phoneLast5: "12345",
    });
    expect(result).toMatchObject({
      courier: "jne",
      awb: "123",
      status: "ON PROCESS",
      delivered: false,
    });
    expect(result.history).toEqual([
      { time: "2026-10-01 10:00", description: "Paket diterima", location: "JAKARTA" },
    ]);
  });
});
