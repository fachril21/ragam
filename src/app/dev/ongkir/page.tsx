import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/core/data";
import { OngkirTester, type VariantOption } from "./OngkirTester";

export const metadata = { title: "Uji ongkir", robots: { index: false, follow: false } };

const SAMPLE_PRODUCTS = 3;

export default async function OngkirDevPage() {
  // Internal QA page: hidden in production builds, like /design.
  if (process.env.NODE_ENV === "production") notFound();

  const summaries = await getProducts({ limit: SAMPLE_PRODUCTS });
  const details = await Promise.all(summaries.map((p) => getProductBySlug(p.slug)));
  const variants: VariantOption[] = details.flatMap((product) =>
    (product?.variants ?? []).map((v) => ({
      id: v.id,
      label: `${product?.name} · ${v.color} ${v.size}`.replace(/\s+/g, " ").trim(),
      weightGrams: v.weightGrams,
    })),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Uji ongkir (internal)</h1>
        <p className="text-text-muted mt-1 text-sm">
          Pilih tujuan dan isi keranjang contoh. Berat selalu dihitung di server dari data varian.
        </p>
      </header>
      <OngkirTester variants={variants} />
    </div>
  );
}
