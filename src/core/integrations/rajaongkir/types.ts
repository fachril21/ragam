export const COURIER_CODES = ["jne", "jnt", "sicepat", "pos"] as const;
export type CourierCode = (typeof COURIER_CODES)[number];

export const isCourierCode = (value: string): value is CourierCode =>
  (COURIER_CODES as readonly string[]).includes(value);

/** Internal shapes. UI and callers never see raw RajaOngkir fields. */
export interface DestinationOption {
  id: string;
  label: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  zipCode: string;
}

export interface ShippingRate {
  courier: string;
  courierName: string;
  service: string;
  description: string;
  /** Integer rupiah. */
  cost: number;
  /** Estimate as returned by the courier (e.g. "1-2 day"); null when unavailable. */
  etd: string | null;
}

export interface TrackingEvent {
  time: string;
  description: string;
  location: string;
}

export interface TrackingResult {
  courier: string;
  awb: string;
  status: string;
  delivered: boolean;
  history: TrackingEvent[];
}

export interface CostParams {
  origin: string;
  destination: string;
  weightGrams: number;
  couriers: readonly string[];
}

export interface TrackParams {
  courier: string;
  awb: string;
  /** Last 5 digits of the recipient phone; some couriers require it. */
  phoneLast5: string;
}

export const MIN_QUERY_LENGTH = 3;
export const MAX_WEIGHT_GRAMS = 20_000;
