"use client";

import { useState, type FormEvent } from "react";
import { DestinationPicker } from "@/components/shipping/DestinationPicker";
import type { DestinationItem } from "@/components/shipping/useDestinationSearch";
import { RateList, rateKey, type RateOption } from "@/components/shipping/RateList";
import { ShippingFallback } from "@/components/shipping/ShippingFallback";
import { TrackingTimeline, type TrackingResponse } from "@/components/shipping/TrackingTimeline";
import { Button, Input, Select } from "@/components/ui";

export interface VariantOption {
  id: string;
  label: string;
  weightGrams: number;
}

interface ApiError {
  code: string;
  message: string;
}

async function readError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as { error?: Partial<ApiError> } | null;
  return {
    code: body?.error?.code ?? "UPSTREAM_ERROR",
    message: body?.error?.message ?? "Terjadi kesalahan. Coba lagi nanti.",
  };
}

function RatesPanel({ variants }: { variants: VariantOption[] }) {
  const [destination, setDestination] = useState<DestinationItem | null>(null);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{
    rates: RateOption[];
    cached: boolean;
    grams: number;
  } | null>(null);
  const [selected, setSelected] = useState<string | undefined>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!destination) {
      setError({ code: "INVALID_INPUT", message: "Pilih tujuan dari daftar terlebih dulu." });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinationId: destination.id,
          items: [{ variantId, quantity: Number(quantity) }],
        }),
      });
      if (!response.ok) {
        setResult(null);
        setError(await readError(response));
        return;
      }
      const body = (await response.json()) as {
        rates: RateOption[];
        cached: boolean;
        chargeableGrams: number;
      };
      setResult({ rates: body.rates, cached: body.cached, grams: body.chargeableGrams });
      setSelected(undefined);
    } catch {
      setResult(null);
      setError({ code: "NETWORK", message: "Periksa koneksi internet lalu coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const canFallback = error && !["INVALID_INPUT", "RATE_LIMITED"].includes(error.code);

  return (
    <form onSubmit={submit} className="space-y-4" aria-labelledby="rates-heading">
      <h2 id="rates-heading" className="text-lg font-semibold">
        Hitung ongkir
      </h2>
      <DestinationPicker onSelect={setDestination} />
      <Select
        label="Produk"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
        options={variants.map((v) => ({ value: v.id, label: `${v.label} (${v.weightGrams} g)` }))}
      />
      <Input
        label="Jumlah"
        type="number"
        inputMode="numeric"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <Button type="submit" loading={busy} disabled={variants.length === 0}>
        Hitung
      </Button>

      {error &&
        (canFallback ? (
          <ShippingFallback message={error.message} />
        ) : (
          <p role="alert" className="text-error text-sm">
            {error.message}
          </p>
        ))}
      {result && (
        <>
          <p className="text-text-muted text-xs">Berat ditagih: {result.grams} g</p>
          <RateList
            rates={result.rates}
            cached={result.cached}
            selectedKey={selected}
            onSelect={(rate) => setSelected(rateKey(rate))}
          />
        </>
      )}
    </form>
  );
}

function TrackPanel() {
  const [order, setOrder] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingResponse | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const query = new URLSearchParams({ order, phone });
      const response = await fetch(`/api/shipping/track?${query}`);
      if (!response.ok) setError((await readError(response)).message);
      else setData((await response.json()) as TrackingResponse);
    } catch {
      setError("Periksa koneksi internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-labelledby="track-heading">
      <h2 id="track-heading" className="text-lg font-semibold">
        Lacak pesanan
      </h2>
      <Input label="Nomor pesanan" value={order} onChange={(e) => setOrder(e.target.value)} />
      <Input label="Nomor HP" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button type="submit" variant="secondary" loading={busy}>
        Lacak
      </Button>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      {data && <TrackingTimeline data={data} />}
    </form>
  );
}

export function OngkirTester({ variants }: { variants: VariantOption[] }) {
  return (
    <div className="space-y-12">
      {variants.length === 0 && (
        <p role="status" className="text-text-muted text-sm">
          Belum ada data produk. Jalankan seed Supabase dulu.
        </p>
      )}
      <RatesPanel variants={variants} />
      <TrackPanel />
    </div>
  );
}
