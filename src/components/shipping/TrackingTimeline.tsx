"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";

export interface TrackingData {
  courier: string;
  awb: string;
  status: string;
  delivered: boolean;
  history: Array<{ time: string; description: string; location: string }>;
}

export interface TrackingResponse {
  tracking: TrackingData | null;
  reason?: "NO_WAYBILL" | "NOT_FOUND";
  fallback?: { courier: string; awb: string };
}

/** Courier + waybill with a copy button: used when live tracking is unavailable (E21). */
function WaybillFallback({ courier, awb }: { courier: string; awb: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="space-y-2 text-sm">
      <p>
        Kami belum bisa menampilkan perjalanan paket. Lacak langsung di situs resmi{" "}
        <strong>{courier.toUpperCase()}</strong> dengan nomor resi:
      </p>
      <p className="flex items-center gap-3">
        <code className="bg-surface rounded-sm px-2 py-1 font-mono">{awb}</code>
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? "Tersalin" : "Salin nomor resi"}
        </Button>
      </p>
    </div>
  );
}

export function TrackingTimeline({ data }: { data: TrackingResponse }) {
  if (data.reason === "NO_WAYBILL") {
    return (
      <p role="status" className="text-text-muted text-sm">
        Nomor resi belum tersedia. Pesanan Anda belum dikirim; kami akan memberi kabar begitu paket
        diserahkan ke kurir.
      </p>
    );
  }
  if (!data.tracking) {
    return data.fallback ? (
      <WaybillFallback courier={data.fallback.courier} awb={data.fallback.awb} />
    ) : (
      <p role="status" className="text-text-muted text-sm">
        Data pelacakan belum tersedia.
      </p>
    );
  }

  const { tracking } = data;
  return (
    <section aria-label="Pelacakan paket" className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{tracking.courier.toUpperCase()}</strong>
        <code className="font-mono">{tracking.awb}</code>
        <Badge tone={tracking.delivered ? "success" : "neutral"}>
          {tracking.delivered ? "Terkirim" : tracking.status || "Dalam perjalanan"}
        </Badge>
      </p>
      {tracking.history.length === 0 ? (
        <p className="text-text-muted text-sm">Belum ada riwayat perjalanan.</p>
      ) : (
        <ol className="border-border space-y-4 border-l pl-4">
          {tracking.history.map((event, index) => (
            <li key={`${event.time}-${index}`} className="text-sm">
              <p className="font-medium">{event.description}</p>
              <p className="text-text-muted text-xs">
                {event.time}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
