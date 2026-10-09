import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { getProducts } from "@/core/data";
import { formatRupiah } from "@/core/format";
import { storeConfig } from "@/theme/store.config";

async function LatestProducts() {
  let products;
  try {
    products = await getProducts({ limit: 8 });
  } catch {
    return (
      <p className="text-text-muted text-sm">
        Produk belum bisa dimuat. Coba lagi beberapa saat lagi.
      </p>
    );
  }
  if (products.length === 0) return <p className="text-text-muted text-sm">Belum ada produk.</p>;
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <Link href={`/produk/${p.slug}`} className="group block">
            <div className="bg-surface aspect-[4/5] rounded-md" aria-hidden="true" />
            <p className="mt-3 text-sm group-hover:underline">{p.name}</p>
            <p className="text-text-muted text-sm">
              {p.priceFrom === null ? "—" : formatRupiah(p.priceFrom)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="py-16 md:py-24">
        <p className="text-text-muted text-sm">{storeConfig.tagline}</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
          {storeConfig.name}
        </h1>
      </section>
      <section aria-labelledby="terbaru">
        <h2 id="terbaru" className="mb-6 text-xl font-semibold">
          Terbaru
        </h2>
        <Suspense fallback={<ProductsSkeleton />}>
          <LatestProducts />
        </Suspense>
      </section>
    </div>
  );
}
