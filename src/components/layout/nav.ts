export interface NavLink {
  label: string;
  href: string;
}

/** Static until Phase 2 wires categories from the database. */
export const NAV_LINKS: NavLink[] = [
  { label: "Semua Produk", href: "/produk" },
  { label: "Kaos", href: "/kategori/kaos" },
  { label: "Kerudung", href: "/kategori/kerudung" },
  { label: "Outer", href: "/kategori/outer" },
];
