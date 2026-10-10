import type { SupabaseClient } from "@supabase/supabase-js";
import { ShippingError } from "../integrations/rajaongkir/errors";

/** Indonesian numbers compare equal across 08…, +628… and 628… spellings. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export interface ShipmentLookup {
  courier: string;
  awb: string;
  phoneLast5: string;
}

/**
 * Resolves courier and waybill from our own database for a verified (order number, phone) pair.
 * The caller never supplies a waybill or courier (E23). Returns null for both "no such order" and
 * "wrong phone" so the response cannot be used to probe order numbers (E19).
 */
export async function findShipment(
  sb: SupabaseClient,
  orderNumber: string,
  phone: string,
): Promise<ShipmentLookup | null> {
  const number = orderNumber.trim();
  const normalized = normalizePhone(phone);
  if (!number || !normalized) return null;

  const { data, error } = await sb
    .from("orders")
    .select("phone, shipments(courier, tracking_number)")
    .eq("order_number", number)
    .maybeSingle();
  if (error) throw new ShippingError("UPSTREAM_ERROR", "Gagal membaca data pesanan.");
  if (!data || normalizePhone(String(data.phone)) !== normalized) return null;

  const shipments = (data.shipments ?? []) as Array<{
    courier: string;
    tracking_number: string | null;
  }>;
  const shipment = shipments.find((s) => s.tracking_number?.trim()) ?? shipments[0];
  return {
    courier: shipment?.courier ?? "",
    awb: shipment?.tracking_number?.trim() ?? "",
    phoneLast5: normalized.slice(-5),
  };
}
