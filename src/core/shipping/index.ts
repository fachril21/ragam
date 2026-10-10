import "server-only";
import { getRajaOngkirClient } from "../integrations/rajaongkir";
import { getServiceClient } from "../supabase/server";
import { createShippingHandlers } from "./handlers";
import { errorResponse } from "./http";
import { createShippingService } from "./service";
import { consumeRateLimit, createShippingStore } from "./store";
import { findShipment } from "./tracking";

export * from "./service";
export { errorResponse } from "./http";

type Handlers = ReturnType<typeof createShippingHandlers>;

function build(): Handlers {
  const sb = getServiceClient();
  const service = createShippingService({
    client: getRajaOngkirClient(),
    ...createShippingStore(sb),
    warn: (message) => console.warn(`[shipping] ${message}`),
  });
  return createShippingHandlers({
    service,
    limiter: (bucket, max, windowSeconds) => consumeRateLimit(sb, bucket, max, windowSeconds),
    lookupShipment: (orderNumber, phone) => findShipment(sb, orderNumber, phone),
  });
}

/**
 * Route-handler entry point. Building the dependencies can fail (missing env, E1), so that
 * failure is converted to the same structured error response as everything else.
 */
export function shippingRoute(
  pick: (handlers: Handlers) => (request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await pick(build())(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
