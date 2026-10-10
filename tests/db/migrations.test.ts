import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, migrationFiles } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb({ seed: true });
});
afterAll(async () => {
  await db.close();
});

const count = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);

describe("E0-AC3: migrations + seed on an empty database", () => {
  it("uses ordered, numbered migration files", () => {
    const files = migrationFiles();
    expect(files[0]).toMatch(/^001_/);
    expect(files.every((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))).toBe(true);
  });

  it("creates every PRD table", async () => {
    const { rows } = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = rows.map((r) => r.table_name);
    for (const t of [
      "categories",
      "products",
      "product_variants",
      "product_images",
      "orders",
      "order_items",
      "payments",
      "shipments",
      "store_settings",
      "admin_profiles",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("seeds at least 3 categories", async () => {
    expect(await count("select count(*) n from categories")).toBeGreaterThanOrEqual(3);
  });

  it("seeds at least 20 active products", async () => {
    expect(await count("select count(*) n from products where is_active")).toBeGreaterThanOrEqual(
      20,
    );
  });

  it("gives every product at least 3 sizes", async () => {
    const n = await count(`
      select count(*) n from products p
      where (select count(distinct size) from product_variants v where v.product_id = p.id) < 3`);
    expect(n).toBe(0);
  });

  it("gives some products 2 or more colors", async () => {
    const n = await count(`
      select count(*) n from products p
      where (select count(distinct color) from product_variants v where v.product_id = p.id) >= 2`);
    expect(n).toBeGreaterThan(0);
  });

  it("seeds exactly one store_settings row with a size chart in cm", async () => {
    expect(await count("select count(*) n from store_settings")).toBe(1);
    const { rows } = await db.query<{ size_chart: unknown }>(
      "select size_chart from store_settings",
    );
    expect(JSON.stringify(rows[0].size_chart)).toMatch(/cm/i);
  });

  it("populates the search vector for every product", async () => {
    expect(await count("select count(*) n from products where search_vector is null")).toBe(0);
  });

  it("creates the public product-images bucket", async () => {
    const { rows } = await db.query<{ public: boolean }>(
      "select public from storage.buckets where id = 'product-images'",
    );
    expect(rows[0]?.public).toBe(true);
  });
});
