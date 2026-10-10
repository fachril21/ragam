import { describe, expect, it, vi } from "vitest";
import { createCatalogRepository, toProductSummary, type ProductRow } from "./catalog";

const row = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  id: "p1",
  slug: "kaos-basic",
  name: "Kaos Basic",
  description: "desc",
  material: "katun",
  care: "cuci",
  categories: { slug: "kaos", name: "Kaos" },
  product_variants: [
    { id: "v1", color: "putih", size: "M", price: 89000, stock: 0, weight_grams: 200 },
    { id: "v2", color: "hitam", size: "M", price: 99000, stock: 5, weight_grams: 200 },
    { id: "v3", color: "hitam", size: "L", price: 99000, stock: 2, weight_grams: 200 },
  ],
  product_images: [
    { url: "b.webp", thumb_url: "b-t.webp", alt: "b", sort_order: 2, is_primary: false },
    { url: "a.webp", thumb_url: "a-t.webp", alt: "a", sort_order: 1, is_primary: true },
  ],
  ...overrides,
});

describe("toProductSummary", () => {
  it("uses the lowest variant price as priceFrom", () => {
    expect(toProductSummary(row()).priceFrom).toBe(89000);
  });

  it("is in stock when any variant has stock", () => {
    expect(toProductSummary(row()).inStock).toBe(true);
  });

  it("is out of stock when every variant has zero stock", () => {
    const r = row({
      product_variants: [{ id: "v1", color: "", size: "M", price: 1, stock: 0, weight_grams: 1 }],
    });
    expect(toProductSummary(r).inStock).toBe(false);
  });

  it("lists distinct non-empty colors and sizes", () => {
    const s = toProductSummary(row());
    expect(s.colors).toEqual(["putih", "hitam"]);
    expect(s.sizes).toEqual(["M", "L"]);
  });

  it("picks the primary image first, sorted by sort_order", () => {
    const s = toProductSummary(row());
    expect(s.primaryImage?.url).toBe("a.webp");
    expect(s.images.map((i) => i.url)).toEqual(["a.webp", "b.webp"]);
  });

  it("falls back to the first sorted image when none is primary", () => {
    const s = toProductSummary(
      row({
        product_images: [
          { url: "z.webp", thumb_url: null, alt: "", sort_order: 5, is_primary: false },
          { url: "y.webp", thumb_url: null, alt: "", sort_order: 1, is_primary: false },
        ],
      }),
    );
    expect(s.primaryImage?.url).toBe("y.webp");
  });

  it("handles a product with no variants or images", () => {
    const s = toProductSummary(row({ product_variants: [], product_images: [] }));
    expect(s.priceFrom).toBeNull();
    expect(s.inStock).toBe(false);
    expect(s.primaryImage).toBeNull();
  });
});

/** Chainable fake of the PostgREST builder; resolves to `result` when awaited. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "range", "limit", "maybeSingle"]) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    });
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  const from = vi.fn(() => builder);
  return { client: { from } as never, from, calls };
}

describe("createCatalogRepository", () => {
  it("getProducts returns summaries and filters to active products", async () => {
    const { client, calls } = fakeClient({ data: [row()], error: null });
    const repo = createCatalogRepository(client);
    const result = await repo.getProducts({ limit: 24, page: 1 });
    expect(result[0].slug).toBe("kaos-basic");
    expect(calls).toContainEqual(["eq", ["is_active", true]]);
    expect(calls).toContainEqual(["range", [0, 23]]);
  });

  it("getProducts computes the range from page and limit", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await createCatalogRepository(client).getProducts({ limit: 24, page: 3 });
    expect(calls).toContainEqual(["range", [48, 71]]);
  });

  it("getProducts throws a descriptive error when the query fails", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    await expect(createCatalogRepository(client).getProducts()).rejects.toThrow(
      /getProducts.*boom/,
    );
  });

  it("getProductBySlug returns null when nothing matches", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await createCatalogRepository(client).getProductBySlug("nope")).toBeNull();
  });

  it("getProductBySlug returns the detail with variants and description", async () => {
    const { client, calls } = fakeClient({ data: row(), error: null });
    const product = await createCatalogRepository(client).getProductBySlug("kaos-basic");
    expect(product?.variants).toHaveLength(3);
    expect(product?.description).toBe("desc");
    expect(calls).toContainEqual(["eq", ["slug", "kaos-basic"]]);
  });

  it("getCategories returns active categories ordered by sort_order", async () => {
    const { client, calls } = fakeClient({
      data: [{ id: "c1", slug: "kaos", name: "Kaos", description: null, image_url: null }],
      error: null,
    });
    const categories = await createCatalogRepository(client).getCategories();
    expect(categories[0].slug).toBe("kaos");
    expect(calls).toContainEqual(["order", ["sort_order", { ascending: true }]]);
  });

  it("getStoreSettings returns null when no row exists", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await createCatalogRepository(client).getStoreSettings()).toBeNull();
  });
});
