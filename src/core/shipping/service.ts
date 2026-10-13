import { ShippingError } from "../integrations/rajaongkir/errors";
import { isRetailService } from "../integrations/rajaongkir/services";
import {
  COURIER_CODES,
  MIN_QUERY_LENGTH,
  type DestinationOption,
  type ShippingRate,
  type TrackParams,
  type TrackingResult,
} from "../integrations/rajaongkir/types";
import type { RajaOngkirClient } from "../integrations/rajaongkir/client";
import {
  chargeableWeight,
  destinationsCacheKey,
  normalizeQuery,
  ratesCacheKey,
  totalWeight,
  trackingCacheKey,
} from "./weight";

export type CacheKind = "destinations" | "rates" | "tracking";

/** TTLs in seconds (PRD E4: regions 24 h, rates 30 min, tracking 15 min). */
export const TTL = {
  destinations: 24 * 60 * 60,
  rates: 30 * 60,
  emptyRates: 5 * 60,
  tracking: 15 * 60,
} as const;

export const QUOTA_WARNING_RATIO = 0.8;

export interface ShippingSettings {
  originDestinationId: string | null;
  activeCouriers: string[];
  apiDailyLimit: number;
}

export interface VariantWeight {
  id: string;
  weightGrams: number;
  isActive: boolean;
  stock: number;
}

/** Everything the service needs from the outside world. Supabase-backed in `store.ts`. */
export interface ShippingDeps {
  client: Pick<RajaOngkirClient, "searchDestination" | "calculateCost" | "trackWaybill">;
  cache: {
    get(key: string): Promise<unknown | null>;
    set(key: string, kind: CacheKind, payload: unknown, ttlSeconds: number): Promise<void>;
  };
  usage: {
    /** Records one upstream call and returns today's total for the provider. */
    record(endpoint: string, failed: boolean): Promise<number>;
    today(): Promise<number>;
  };
  settings(): Promise<ShippingSettings>;
  variants(ids: string[]): Promise<VariantWeight[]>;
  warn(message: string): void;
}

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface PricedRate extends ShippingRate {
  isCheapest: boolean;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  percent: number;
  warning: boolean;
  exhausted: boolean;
}

const invalid = (message: string) => new ShippingError("INVALID_INPUT", message);

export function createShippingService(deps: ShippingDeps) {
  /** Cache hit, or quota check + upstream call + usage record + cache write. */
  async function cached<T>(
    key: string,
    kind: CacheKind,
    endpoint: string,
    ttlFor: (value: T) => number,
    fetchUpstream: () => Promise<T>,
  ): Promise<{ value: T; cached: boolean }> {
    const hit = await deps.cache.get(key);
    if (hit !== null) return { value: hit as T, cached: true };

    const { apiDailyLimit } = await deps.settings();
    if ((await deps.usage.today()) >= apiDailyLimit) {
      throw new ShippingError("QUOTA_EXCEEDED", "Kuota layanan ongkir hari ini habis.");
    }

    let value: T;
    try {
      value = await fetchUpstream();
    } catch (error) {
      await deps.usage.record(endpoint, true);
      throw error;
    }
    const total = await deps.usage.record(endpoint, false);
    const threshold = Math.ceil(apiDailyLimit * QUOTA_WARNING_RATIO);
    if (total >= threshold && total - 1 < threshold) {
      deps.warn(`RajaOngkir quota at ${total}/${apiDailyLimit} (>= 80%)`);
    }
    await deps.cache.set(key, kind, value, ttlFor(value));
    return { value, cached: false };
  }

  return {
    async searchDestinations(query: string) {
      if (normalizeQuery(query).length < MIN_QUERY_LENGTH) {
        throw invalid(`Ketik minimal ${MIN_QUERY_LENGTH} karakter.`);
      }
      const { value, cached: fromCache } = await cached<DestinationOption[]>(
        destinationsCacheKey(query),
        "destinations",
        "destinations",
        () => TTL.destinations,
        () => deps.client.searchDestination(normalizeQuery(query)),
      );
      return { destinations: value, cached: fromCache };
    },

    async getRates(input: { destinationId: string; items: readonly CartLine[]; courier?: string }) {
      const settings = await deps.settings();
      if (!settings.originDestinationId) {
        throw new ShippingError("CONFIG_ERROR", "Asal pengiriman toko belum diatur.");
      }
      if (!input.destinationId) throw invalid("Tujuan wajib dipilih.");
      if (input.courier && !settings.activeCouriers.includes(input.courier)) {
        throw invalid("Kurir tidak tersedia.");
      }

      const lines = input.items.map((i) => ({
        variantId: String(i.variantId),
        quantity: i.quantity,
      }));
      const known = new Map(
        (await deps.variants([...new Set(lines.map((l) => l.variantId))])).map((v) => [v.id, v]),
      );
      const grams = totalWeight(
        lines.map((line) => {
          const variant = known.get(line.variantId);
          if (!variant || !variant.isActive) throw invalid("Produk tidak tersedia.");
          return { weightGrams: variant.weightGrams, quantity: line.quantity };
        }),
      );
      const chargeableGrams = chargeableWeight(grams);

      const key = ratesCacheKey({
        origin: settings.originDestinationId,
        destination: input.destinationId,
        chargeableGrams,
      });
      const origin = settings.originDestinationId;
      const { value, cached: fromCache } = await cached<ShippingRate[]>(
        key,
        "rates",
        "cost",
        (rates) => (rates.length === 0 ? TTL.emptyRates : TTL.rates),
        () =>
          deps.client.calculateCost({
            origin,
            destination: input.destinationId,
            weightGrams: chargeableGrams,
            couriers: COURIER_CODES,
          }),
      );

      const active = new Set(input.courier ? [input.courier] : settings.activeCouriers);
      const rates = value
        .filter((r) => active.has(r.courier) && isRetailService(r.courier, r.service))
        .sort((a, b) => a.cost - b.cost)
        .map((r, index): PricedRate => ({ ...r, isCheapest: index === 0 }));
      return { rates, chargeableGrams, cached: fromCache };
    },

    async track(params: TrackParams) {
      const awb = params.awb.trim();
      if (!awb) throw new ShippingError("NOT_FOUND", "Nomor resi belum tersedia.");
      const { value, cached: fromCache } = await cached<TrackingResult>(
        trackingCacheKey(params.courier, awb),
        "tracking",
        "track",
        () => TTL.tracking,
        () => deps.client.trackWaybill({ ...params, awb }),
      );
      return { tracking: value, cached: fromCache };
    },

    async getQuotaStatus(): Promise<QuotaStatus> {
      const { apiDailyLimit } = await deps.settings();
      const used = await deps.usage.today();
      const percent = Math.round((used / apiDailyLimit) * 100);
      return {
        used,
        limit: apiDailyLimit,
        percent,
        warning: used >= Math.ceil(apiDailyLimit * QUOTA_WARNING_RATIO),
        exhausted: used >= apiDailyLimit,
      };
    },
  };
}

export type ShippingService = ReturnType<typeof createShippingService>;
