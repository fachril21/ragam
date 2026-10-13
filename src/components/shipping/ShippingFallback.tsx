import { whatsappLink } from "@/theme/store.config";

interface ShippingFallbackProps {
  message: string;
  /** Pre-filled WhatsApp text, e.g. the cart contents. */
  whatsappText?: string;
}

/** Shown when shipping cannot be calculated: explains why and offers a human fallback (E4-AC4). */
export function ShippingFallback({ message, whatsappText }: ShippingFallbackProps) {
  const text =
    whatsappText ?? "Halo, saya ingin memesan tetapi ongkir tidak bisa dihitung. Bisa dibantu?";
  return (
    <div role="alert" className="border-error/40 bg-surface rounded-md border p-4 text-sm">
      <p className="text-error font-medium">{message}</p>
      <p className="text-text-muted mt-1">
        Anda tetap bisa memesan lewat WhatsApp, kami bantu hitung ongkirnya.
      </p>
      <a
        href={whatsappLink(text)}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-accent text-on-accent focus-visible:outline-accent mt-3 inline-flex h-11 items-center rounded-md px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Pesan lewat WhatsApp
      </a>
    </div>
  );
}
