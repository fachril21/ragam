import Link from "next/link";
import { storeConfig, whatsappLink } from "@/theme/store.config";

export function Footer() {
  return (
    <footer className="border-border bg-surface mt-16 border-t">
      {storeConfig.isDemo && (
        <p className="bg-primary text-on-primary px-4 py-2 text-center text-xs">
          Contoh produk — situs demo. Tidak menerima pesanan nyata.
        </p>
      )}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
        <section aria-labelledby="footer-store">
          <h2 id="footer-store" className="mb-2 font-semibold">
            {storeConfig.name}
          </h2>
          <p className="text-text-muted">{storeConfig.tagline}</p>
          <p className="text-text-muted mt-2">{storeConfig.address}</p>
        </section>
        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact" className="mb-2 font-semibold">
            Hubungi kami
          </h2>
          <ul className="text-text-muted space-y-1">
            <li>
              <a
                href={whatsappLink()}
                className="underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${storeConfig.email}`} className="underline underline-offset-2">
                {storeConfig.email}
              </a>
            </li>
            <li>Jam layanan: {storeConfig.hours}</li>
          </ul>
        </section>
        <section aria-labelledby="footer-info">
          <h2 id="footer-info" className="mb-2 font-semibold">
            Informasi
          </h2>
          <ul className="text-text-muted space-y-1">
            <li>
              <Link href="/retur" className="underline underline-offset-2">
                Kebijakan retur
              </Link>
            </li>
            <li>
              <Link href="/syarat" className="underline underline-offset-2">
                Syarat dan ketentuan
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </footer>
  );
}
