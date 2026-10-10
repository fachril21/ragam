import { notFound } from "next/navigation";
import {
  Accordion,
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Input,
  Pagination,
  RadioGroup,
  Select,
  Skeleton,
} from "@/components/ui";
import { contrastRatio } from "@/theme/contrast";
import { tokens } from "@/theme/tokens";
import { DesignOverlays } from "./DesignOverlays";

export const metadata = { title: "Design system", robots: { index: false, follow: false } };

export default function DesignPage() {
  // Dev-only reference page: hidden in production builds.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <h1 className="text-3xl font-semibold">Design system</h1>

      <section aria-labelledby="d-color" className="space-y-3">
        <h2 id="d-color" className="text-lg font-semibold">
          Warna dan kontras (WCAG AA ≥ 4,5)
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(tokens.color).map(([name, value]) => (
            <li key={name} className="border-border rounded-md border p-3 text-xs">
              <div
                className="border-border mb-2 h-10 rounded-sm border"
                style={{ background: value }}
              />
              <p className="font-medium">{name}</p>
              <p className="text-text-muted">
                {value} · {contrastRatio(value, tokens.color.background).toFixed(1)}:1 vs putih
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="d-btn" className="space-y-3">
        <h2 id="d-btn" className="text-lg font-semibold">
          Tombol
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Memuat</Button>
          <Button disabled>Nonaktif</Button>
        </div>
      </section>

      <section aria-labelledby="d-form" className="space-y-4">
        <h2 id="d-form" className="text-lg font-semibold">
          Form
        </h2>
        <div className="grid max-w-md gap-4">
          <Input label="Nama lengkap" name="name" required />
          <Input label="Email" name="email" error="Format email tidak valid" defaultValue="abc" />
          <Select
            label="Ukuran"
            name="size"
            options={[
              { value: "S", label: "S" },
              { value: "M", label: "M" },
            ]}
          />
          <Checkbox label="Saya setuju dengan syarat dan ketentuan" name="agree" />
          <RadioGroup
            legend="Kurir"
            name="courier"
            defaultValue="jne"
            options={[
              { value: "jne", label: "JNE" },
              { value: "jnt", label: "J&T" },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="d-misc" className="space-y-4">
        <h2 id="d-misc" className="text-lg font-semibold">
          Lainnya
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Baru</Badge>
          <Badge tone="success">Tersedia</Badge>
          <Badge tone="warning">Sisa 3</Badge>
          <Badge tone="error">Stok habis</Badge>
          <Badge tone="accent">Diskon</Badge>
        </div>
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/" },
            { label: "Kaos", href: "/kategori/kaos" },
            { label: "Kaos Basic" },
          ]}
        />
        <Skeleton className="h-24 w-full max-w-sm" />
        <Accordion
          items={[
            { id: "bahan", title: "Bahan", content: "Katun combed 30s" },
            { id: "perawatan", title: "Perawatan", content: "Cuci dengan air dingin." },
          ]}
        />
        <Pagination page={2} totalPages={5} basePath="/design" />
        <DesignOverlays />
      </section>
    </div>
  );
}
