import { z } from "zod";
import { ShippingError } from "./errors";
import {
  MAX_WEIGHT_GRAMS,
  MIN_QUERY_LENGTH,
  type CostParams,
  type DestinationOption,
  type ShippingRate,
  type TrackParams,
  type TrackingResult,
} from "./types";

/**
 * RajaOngkir (Komerce) v1 HTTP client.
 * Docs: https://rajaongkir.com/docs/shipping-cost/getting_started/endpoint (checked 2026-10-10)
 * Base URL https://rajaongkir.komerce.id/api/v1/, auth via the `key` header.
 * Behaviour observed in docs/spike-rajaongkir.md. The success shape of `track/waybill` has not
 * been observed against a real waybill yet, so its parser is deliberately tolerant.
 */

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRY_DELAY_MS = 300;

export interface RajaOngkirClientOptions {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
}

const destinationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  label: z.string(),
  province_name: z.string(),
  city_name: z.string(),
  district_name: z.string(),
  subdistrict_name: z.string(),
  zip_code: z.string(),
});

const rateSchema = z.object({
  name: z.string(),
  code: z.string(),
  service: z.string(),
  description: z.string().default(""),
  cost: z.number(),
  etd: z.string().nullish(),
});

const trackSchema = z.object({
  delivered: z.boolean().optional(),
  summary: z
    .object({
      courier_name: z.string().optional(),
      waybill_number: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
  manifest: z
    .array(
      z.object({
        manifest_description: z.string().default(""),
        manifest_date: z.string().default(""),
        manifest_time: z.string().default(""),
        city_name: z.string().default(""),
      }),
    )
    .default([]),
});

const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ meta: z.object({ code: z.number(), message: z.string().optional() }), data });

const upstream = (message: string) => new ShippingError("UPSTREAM_ERROR", message);

export function createRajaOngkirClient(options: RajaOngkirClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const base = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;

  async function attempt(url: URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** One automatic retry for transient network failures and timeouts (never for quota). */
  async function send(url: URL, init: RequestInit): Promise<Response> {
    for (let tries = 0; ; tries++) {
      try {
        return await attempt(url, init);
      } catch (error) {
        if (tries >= 1) {
          const aborted = error instanceof DOMException && error.name === "AbortError";
          throw aborted
            ? new ShippingError("TIMEOUT", "Layanan ongkir terlalu lama merespons.")
            : upstream("Tidak dapat menghubungi layanan ongkir.");
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async function request<T extends z.ZodType>(
    method: "GET" | "POST",
    path: string,
    params: Record<string, string>,
    data: T,
  ): Promise<z.infer<T>> {
    const url = new URL(path, base);
    const headers: Record<string, string> = { key: options.apiKey };
    const init: RequestInit = { method, headers };
    if (method === "GET") {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    } else {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = new URLSearchParams(params).toString();
    }

    const response = await send(url, init);
    const body: unknown = await response.json().catch(() => undefined);

    if (response.status === 429) {
      throw new ShippingError("QUOTA_EXCEEDED", "Kuota layanan ongkir hari ini habis.");
    }
    if (response.status === 404) {
      throw new ShippingError("NOT_FOUND", "Data tidak ditemukan.");
    }
    if (!response.ok) throw upstream("Layanan ongkir sedang bermasalah.");
    if (body === undefined) throw upstream("Respons layanan ongkir tidak valid.");

    const parsed = envelope(data).safeParse(body);
    if (!parsed.success) throw upstream("Format respons layanan ongkir tidak dikenali.");
    return (parsed.data as { data: z.infer<T> }).data;
  }

  return {
    async searchDestination(query: string): Promise<DestinationOption[]> {
      const search = query.trim();
      if (search.length < MIN_QUERY_LENGTH) {
        throw new ShippingError("INVALID_INPUT", `Ketik minimal ${MIN_QUERY_LENGTH} karakter.`);
      }
      const rows = await request(
        "GET",
        "destination/domestic-destination",
        { search, limit: "10", offset: "0" },
        z.array(destinationSchema),
      );
      return rows.map((r) => ({
        id: String(r.id),
        label: r.label,
        province: r.province_name,
        city: r.city_name,
        district: r.district_name,
        subdistrict: r.subdistrict_name,
        zipCode: r.zip_code,
      }));
    },

    async calculateCost(params: CostParams): Promise<ShippingRate[]> {
      const { weightGrams } = params;
      if (!Number.isInteger(weightGrams) || weightGrams < 1 || weightGrams > MAX_WEIGHT_GRAMS) {
        throw new ShippingError("INVALID_INPUT", "Berat paket tidak valid.");
      }
      if (!params.origin || !params.destination || params.couriers.length === 0) {
        throw new ShippingError("INVALID_INPUT", "Asal, tujuan, dan kurir wajib diisi.");
      }
      const rows = await request(
        "POST",
        "calculate/domestic-cost",
        {
          origin: params.origin,
          destination: params.destination,
          weight: String(weightGrams),
          courier: params.couriers.join(":"),
          price: "lowest",
        },
        z.array(rateSchema),
      );
      return rows.map((r) => ({
        courier: r.code,
        courierName: r.name,
        service: r.service,
        description: r.description,
        cost: r.cost,
        etd: r.etd?.trim() ? r.etd.trim() : null,
      }));
    },

    async trackWaybill(params: TrackParams): Promise<TrackingResult> {
      const awb = params.awb.trim();
      if (!awb || !params.courier) {
        throw new ShippingError("INVALID_INPUT", "Nomor resi dan kurir wajib diisi.");
      }
      const data = await request(
        "POST",
        "track/waybill",
        { awb, courier: params.courier, last_phone_number: params.phoneLast5 },
        trackSchema,
      );
      return {
        courier: params.courier,
        awb,
        status: data.summary?.status ?? "",
        delivered: data.delivered ?? false,
        history: data.manifest.map((m) => ({
          time: `${m.manifest_date} ${m.manifest_time}`.trim(),
          description: m.manifest_description,
          location: m.city_name,
        })),
      };
    },
  };
}

export type RajaOngkirClient = ReturnType<typeof createRajaOngkirClient>;
