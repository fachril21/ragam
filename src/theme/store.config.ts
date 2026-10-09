/**
 * Per-shop identity. Per client, edit this file (admin settings in Phase 6 override
 * these values at runtime from the `store_settings` table).
 */
export const storeConfig = {
  name: "Ragam",
  tagline: "Busana sehari-hari untuk semua",
  logo: "/logo.svg",
  /** International format without "+", used by wa.me. */
  whatsapp: "6281234567890",
  email: "halo@ragam.example",
  address: "Jl. Contoh No. 1, Jakarta",
  hours: "Senin–Sabtu, 09.00–17.00 WIB",
  social: { instagram: "https://instagram.com/ragam.example", tiktok: "" },
  analyticsId: "",
  isDemo: true,
} as const;

export type StoreConfig = typeof storeConfig;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${storeConfig.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
