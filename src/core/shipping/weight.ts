import { ShippingError } from "../integrations/rajaongkir/errors";
import { MAX_WEIGHT_GRAMS } from "../integrations/rajaongkir/types";

/** Courier weight bracket: parcels are billed per 500 g, minimum one bracket. */
export const WEIGHT_STEP_GRAMS = 500;

const invalid = (message: string) => new ShippingError("INVALID_INPUT", message);

export function chargeableWeight(grams: number): number {
  if (!Number.isInteger(grams) || grams < 1 || grams > MAX_WEIGHT_GRAMS) {
    throw invalid("Berat paket tidak valid (maksimal 20 kg).");
  }
  return Math.ceil(grams / WEIGHT_STEP_GRAMS) * WEIGHT_STEP_GRAMS;
}

export interface WeightedItem {
  weightGrams: number;
  quantity: number;
}

export function totalWeight(items: readonly WeightedItem[]): number {
  if (items.length === 0) throw invalid("Keranjang tidak berisi item.");
  return items.reduce((sum, item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw invalid("Jumlah item tidak valid.");
    }
    return sum + item.weightGrams * item.quantity;
  }, 0);
}

export const normalizeQuery = (query: string): string =>
  query.trim().toLowerCase().replace(/\s+/g, " ");

export interface RatesKeyParts {
  origin: string;
  destination: string;
  chargeableGrams: number;
}

/** Couriers are not part of the key: one upstream call returns every active courier (D3). */
export const ratesCacheKey = ({ origin, destination, chargeableGrams }: RatesKeyParts): string =>
  `rates:${origin}:${destination}:${chargeableGrams}`;

export const destinationsCacheKey = (query: string): string =>
  `destinations:${normalizeQuery(query)}`;

export const trackingCacheKey = (courier: string, awb: string): string =>
  `tracking:${courier}:${awb.trim()}`;
