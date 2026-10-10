import { z } from "zod";
import { ShippingError, isShippingError } from "../integrations/rajaongkir/errors";
import { MIN_QUERY_LENGTH } from "../integrations/rajaongkir/types";
import { clientIp, errorResponse } from "./http";
import type { ShippingService } from "./service";
import type { ShipmentLookup } from "./tracking";

const WINDOW_SECONDS = 60;
const LIMITS = { destinations: 10, rates: 20, track: 10 } as const;
const MAX_CART_LINES = 50;
const MAX_QUANTITY = 99;

/** Everything a handler needs; wired to Supabase/RajaOngkir in `index.ts`, mocked in tests. */
export interface HandlerContext {
  service: ShippingService;
  limiter(bucket: string, max: number, windowSeconds: number): Promise<boolean>;
  lookupShipment(orderNumber: string, phone: string): Promise<ShipmentLookup | null>;
}

const ratesBody = z.object({
  destinationId: z.string().trim().min(1).max(20),
  courier: z.string().trim().min(1).max(20).optional(),
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_CART_LINES),
});

const invalid = (message: string) => new ShippingError("INVALID_INPUT", message);

export function createShippingHandlers(context: HandlerContext) {
  async function guarded(
    name: keyof typeof LIMITS,
    request: Request,
    run: () => Promise<Response>,
  ): Promise<Response> {
    try {
      const bucket = `shipping:${name}:${clientIp(request.headers)}`;
      if (!(await context.limiter(bucket, LIMITS[name], WINDOW_SECONDS))) {
        return errorResponse(
          new ShippingError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar lagi."),
        );
      }
      return await run();
    } catch (error) {
      return errorResponse(error);
    }
  }

  return {
    destinations: (request: Request) =>
      guarded("destinations", request, async () => {
        const q = new URL(request.url).searchParams.get("q") ?? "";
        if (q.trim().length < MIN_QUERY_LENGTH) {
          throw invalid(`Ketik minimal ${MIN_QUERY_LENGTH} karakter.`);
        }
        return Response.json(await context.service.searchDestinations(q));
      }),

    rates: (request: Request) =>
      guarded("rates", request, async () => {
        const raw: unknown = await request.json().catch(() => undefined);
        const parsed = ratesBody.safeParse(raw);
        if (!parsed.success) throw invalid("Data permintaan ongkir tidak valid.");
        const { destinationId, items, courier } = parsed.data;
        return Response.json(await context.service.getRates({ destinationId, items, courier }));
      }),

    track: (request: Request) =>
      guarded("track", request, async () => {
        const params = new URL(request.url).searchParams;
        const order = params.get("order") ?? "";
        const phone = params.get("phone") ?? "";
        if (!order.trim() || !phone.trim())
          throw invalid("Nomor pesanan dan nomor HP wajib diisi.");

        const shipment = await context.lookupShipment(order, phone);
        if (!shipment) throw new ShippingError("NOT_FOUND", "Pesanan tidak ditemukan.");
        if (!shipment.awb) return Response.json({ tracking: null, reason: "NO_WAYBILL" });

        try {
          const { tracking, cached } = await context.service.track(shipment);
          return Response.json({ tracking, cached });
        } catch (error) {
          if (isShippingError(error) && error.code === "NOT_FOUND") {
            return Response.json({
              tracking: null,
              reason: "NOT_FOUND",
              fallback: { courier: shipment.courier, awb: shipment.awb },
            });
          }
          throw error;
        }
      }),
  };
}
