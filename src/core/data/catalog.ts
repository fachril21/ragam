import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  material: string | null;
  care: string | null;
  categories: { slug: string; name: string } | null;
  product_variants: Array<{
    id: string;
    color: string;
    size: string;
    price: number;
    stock: number;
    weight_grams: number;
  }>;
  product_images: Array<{
    url: string;
    thumb_url: string | null;
    alt: string;
    sort_order: number;
    is_primary: boolean;
  }>;
}

export interface ProductImage {
  url: string;
  thumbUrl: string | null;
  alt: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  weightGrams: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  category: { slug: string; name: string } | null;
  priceFrom: number | null;
  inStock: boolean;
  colors: string[];
  sizes: string[];
  primaryImage: ProductImage | null;
  images: ProductImage[];
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  material: string | null;
  care: string | null;
  variants: ProductVariant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface PublicStoreSettings {
  name: string;
  logoUrl: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  sizeChart: unknown;
  banner: unknown;
  lowStockThreshold: number;
}

const PRODUCT_SELECT = `
  id, slug, name, description, material, care,
  categories ( slug, name ),
  product_variants ( id, color, size, price, stock, weight_grams ),
  product_images ( url, thumb_url, alt, sort_order, is_primary )
`;

const distinct = (values: string[]) => [...new Set(values.filter((v) => v !== ""))];

export function toProductSummary(row: ProductRow): ProductSummary {
  const images = [...row.product_images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, thumbUrl: i.thumb_url, alt: i.alt }));
  const prices = row.product_variants.map((v) => v.price);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categories,
    priceFrom: prices.length ? Math.min(...prices) : null,
    inStock: row.product_variants.some((v) => v.stock > 0),
    colors: distinct(row.product_variants.map((v) => v.color)),
    sizes: distinct(row.product_variants.map((v) => v.size)),
    primaryImage: images[0] ?? null,
    images,
  };
}

export function toProductDetail(row: ProductRow): ProductDetail {
  return {
    ...toProductSummary(row),
    description: row.description,
    material: row.material,
    care: row.care,
    variants: row.product_variants.map((v) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      price: v.price,
      stock: v.stock,
      weightGrams: v.weight_grams,
    })),
  };
}

function fail(operation: string, error: { message: string }): never {
  throw new Error(`${operation} failed: ${error.message}`);
}

export interface ListProductsOptions {
  page?: number;
  limit?: number;
}

export function createCatalogRepository(client: SupabaseClient) {
  return {
    async getProducts({
      page = 1,
      limit = 24,
    }: ListProductsOptions = {}): Promise<ProductSummary[]> {
      const from = (page - 1) * limit;
      const { data, error } = await client
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);
      if (error) fail("getProducts", error);
      return ((data ?? []) as unknown as ProductRow[]).map(toProductSummary);
    },

    async getProductBySlug(slug: string): Promise<ProductDetail | null> {
      const { data, error } = await client
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) fail("getProductBySlug", error);
      return data ? toProductDetail(data as unknown as ProductRow) : null;
    },

    async getCategories(): Promise<Category[]> {
      const { data, error } = await client
        .from("categories")
        .select("id, slug, name, description, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) fail("getCategories", error);
      return (data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
      }));
    },

    async getStoreSettings(): Promise<PublicStoreSettings | null> {
      const { data, error } = await client
        .from("store_settings")
        .select(
          "name, logo_url, whatsapp, email, address, hours, size_chart, banner, low_stock_threshold",
        )
        .maybeSingle();
      if (error) fail("getStoreSettings", error);
      if (!data) return null;
      return {
        name: data.name,
        logoUrl: data.logo_url,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        hours: data.hours,
        sizeChart: data.size_chart,
        banner: data.banner,
        lowStockThreshold: data.low_stock_threshold,
      };
    },
  };
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>;
