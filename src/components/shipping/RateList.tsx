"use client";

import { Badge, cn } from "@/components/ui";
import { formatRupiah } from "@/core/format";

export interface RateOption {
  courier: string;
  courierName: string;
  service: string;
  description: string;
  cost: number;
  etd: string | null;
  isCheapest: boolean;
}

export const rateKey = (rate: Pick<RateOption, "courier" | "service">) =>
  `${rate.courier}:${rate.service}`;

interface RateListProps {
  rates: RateOption[];
  selectedKey?: string;
  onSelect?: (rate: RateOption) => void;
  /** Shown as a small note, e.g. "dari cache" on the dev page. */
  cached?: boolean;
}

/** Shipping options sorted by price; the cheapest is flagged (E4-AC2). */
export function RateList({ rates, selectedKey, onSelect, cached }: RateListProps) {
  if (rates.length === 0) {
    return (
      <p role="status" className="text-text-muted text-sm">
        Belum ada layanan pengiriman untuk tujuan ini. Coba tujuan lain atau hubungi kami.
      </p>
    );
  }
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Pilih pengiriman</legend>
      {rates.map((rate) => {
        const key = rateKey(rate);
        const checked = selectedKey === key;
        return (
          <label
            key={key}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
              "focus-within:outline-accent focus-within:outline-2 focus-within:outline-offset-1",
              checked ? "border-primary bg-surface" : "border-border hover:bg-surface",
            )}
          >
            <input
              type="radio"
              name="shipping-rate"
              value={key}
              checked={checked}
              onChange={() => onSelect?.(rate)}
              className="accent-primary size-4"
            />
            <span className="flex-1">
              <span className="block font-medium">
                {rate.courier.toUpperCase()} {rate.service}
                {rate.isCheapest && (
                  <Badge tone="success" className="ml-2">
                    Termurah
                  </Badge>
                )}
              </span>
              <span className="text-text-muted block text-xs">
                {rate.etd ? `Estimasi ${rate.etd}` : "Estimasi tidak tersedia"}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{formatRupiah(rate.cost)}</span>
          </label>
        );
      })}
      {cached && <p className="text-text-muted text-xs">Hasil dari cache (tidak memakai kuota).</p>}
    </fieldset>
  );
}
