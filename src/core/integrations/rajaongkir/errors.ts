export type ShippingErrorCode =
  | "TIMEOUT"
  | "QUOTA_EXCEEDED"
  | "UPSTREAM_ERROR"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFIG_ERROR"
  | "RATE_LIMITED";

const HTTP_STATUS: Record<ShippingErrorCode, number> = {
  TIMEOUT: 504,
  QUOTA_EXCEEDED: 429,
  UPSTREAM_ERROR: 502,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFIG_ERROR: 503,
  RATE_LIMITED: 429,
};

/** Classified failure. Messages are safe to show to users; they never contain secrets. */
export class ShippingError extends Error {
  readonly code: ShippingErrorCode;

  constructor(code: ShippingErrorCode, message: string) {
    super(message);
    this.name = "ShippingError";
    this.code = code;
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }
}

export const isShippingError = (value: unknown): value is ShippingError =>
  value instanceof ShippingError;
