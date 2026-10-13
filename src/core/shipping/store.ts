import type { SupabaseClient } from "@supabase/supabase-js";
import { ShippingError } from "../integrations/rajaongkir/errors";
import type { CacheKind, ShippingDeps } from "./service";

const PROVIDER = "rajaongkir";
const DEFAULT_DAILY_LIMIT = 100;

const dbError = (what: string) =>
  new ShippingError("UPSTREAM_ERROR", `Gagal membaca atau menulis ${what}.`);

/** Jakarta calendar day (YYYY-MM-DD), matching `increment_api_usage` in migration 007. */
const jakartaDay = (now: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);

/** Supabase-backed implementation of the service's storage ports. Service-role client only. */
export function createShippingStore(
  sb: SupabaseClient,
  now: () => Date = () => new Date(),
): Omit<ShippingDeps, "client" | "warn"> {
  return {
    cache: {
      async get(key) {
        const { data, error } = await sb
          .from("shipping_cache")
          .select("payload, expires_at")
          .eq("key", key)
          .maybeSingle();
        if (error) throw dbError("cache ongkir");
        if (!data || new Date(data.expires_at as string).getTime() <= now().getTime()) return null;
        return data.payload;
      },
      async set(key: string, kind: CacheKind, payload: unknown, ttlSeconds: number) {
        const expiresAt = new Date(now().getTime() + ttlSeconds * 1000).toISOString();
        const { error } = await sb
          .from("shipping_cache")
          .upsert({ key, kind, payload, expires_at: expiresAt }, { onConflict: "key" });
        if (error) throw dbError("cache ongkir");
      },
    },

    usage: {
      async record(endpoint, failed) {
        const { data, error } = await sb.rpc("increment_api_usage", {
          p_provider: PROVIDER,
          p_endpoint: endpoint,
          p_failed: failed,
        });
        if (error) throw dbError("pemakaian API");
        return Number(data);
      },
      async today() {
        const { data, error } = await sb
          .from("api_usage")
          .select("calls")
          .eq("provider", PROVIDER)
          .eq("day", jakartaDay(now()));
        if (error) throw dbError("pemakaian API");
        return ((data ?? []) as Array<{ calls: number }>).reduce((sum, r) => sum + r.calls, 0);
      },
    },

    async settings() {
      const { data, error } = await sb
        .from("store_settings")
        .select("origin_destination_id, active_couriers, api_daily_limit")
        .limit(1)
        .maybeSingle();
      if (error) throw dbError("pengaturan toko");
      return {
        originDestinationId: (data?.origin_destination_id as string | null) ?? null,
        activeCouriers: (data?.active_couriers as string[] | undefined) ?? [],
        apiDailyLimit: (data?.api_daily_limit as number | undefined) ?? DEFAULT_DAILY_LIMIT,
      };
    },

    async variants(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await sb
        .from("product_variants")
        .select("id, weight_grams, stock, products(is_active)")
        .in("id", ids);
      if (error) throw dbError("data varian");
      type Row = {
        id: string;
        weight_grams: number;
        stock: number;
        products: { is_active: boolean } | { is_active: boolean }[] | null;
      };
      return ((data ?? []) as unknown as Row[]).map((row) => {
        const product = Array.isArray(row.products) ? row.products[0] : row.products;
        return {
          id: row.id,
          weightGrams: row.weight_grams,
          isActive: product?.is_active ?? false,
          stock: row.stock,
        };
      });
    },
  };
}

/** Fixed-window limiter backed by `consume_rate_limit`. Fails open if the limiter errors. */
export async function consumeRateLimit(
  sb: SupabaseClient,
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await sb.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return true;
  return data === true;
}
