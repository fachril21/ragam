import "server-only";
import { parseServerEnv } from "../../env";
import { createRajaOngkirClient, type RajaOngkirClient } from "./client";
import { ShippingError } from "./errors";

export * from "./errors";
export * from "./types";
export { isRetailService } from "./services";
export { createRajaOngkirClient, type RajaOngkirClient } from "./client";

let cached: RajaOngkirClient | undefined;

/** Lazily builds the client from server env. Throws CONFIG_ERROR when the key is not set (E1). */
export function getRajaOngkirClient(): RajaOngkirClient {
  if (cached) return cached;
  const env = parseServerEnv(process.env);
  if (!env.RAJAONGKIR_API_KEY || !env.RAJAONGKIR_BASE_URL) {
    throw new ShippingError("CONFIG_ERROR", "Layanan ongkir belum dikonfigurasi.");
  }
  cached = createRajaOngkirClient({
    apiKey: env.RAJAONGKIR_API_KEY,
    baseUrl: env.RAJAONGKIR_BASE_URL,
  });
  return cached;
}
