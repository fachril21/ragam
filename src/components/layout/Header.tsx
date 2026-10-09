import Link from "next/link";
import { storeConfig } from "@/theme/store.config";
import { MobileMenu } from "./MobileMenu";
import { NAV_LINKS } from "./nav";

export function Header() {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <MobileMenu links={NAV_LINKS} />
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {storeConfig.name}
        </Link>
        <nav aria-label="Menu utama" className="hidden flex-1 items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/cari" role="search" className="ml-auto hidden md:block">
          <label htmlFor="header-search" className="sr-only">
            Cari produk
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Cari produk"
            className="border-border bg-surface focus-visible:outline-accent h-10 w-56 rounded-md border px-3 text-sm focus-visible:outline-2"
          />
        </form>
        <Link
          href="/cari"
          aria-label="Cari produk"
          className="hover:bg-surface ml-auto rounded-md px-3 py-2 text-sm md:hidden"
        >
          Cari
        </Link>
        <Link
          href="/keranjang"
          aria-label="Keranjang belanja"
          className="hover:bg-surface rounded-md px-3 py-2 text-sm"
        >
          Keranjang
        </Link>
      </div>
    </header>
  );
}
