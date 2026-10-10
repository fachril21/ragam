import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, rejects } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb({ seed: true });
});
afterAll(async () => {
  await db.close();
});

const firstVariantId = async () =>
  (await db.query<{ id: string }>("select id from product_variants limit 1")).rows[0].id;

const insertOrder = (orderNumber: string) => `
  insert into orders (order_number, customer_name, phone, email, address, subtotal, shipping_cost, total)
  values ('${orderNumber}', 'A', '628111', 'a@b.co', 'x', 1000, 0, 1000)`;

describe("E0-AC5: data integrity", () => {
  it("stores money columns as integers", async () => {
    const { rows } = await db.query<{ data_type: string }>(`
      select data_type from information_schema.columns
      where table_schema = 'public' and (table_name, column_name) in (
        ('product_variants','price'), ('orders','subtotal'), ('orders','shipping_cost'),
        ('orders','total'), ('order_items','unit_price'), ('payments','amount'))`);
    expect(rows).toHaveLength(6);
    for (const r of rows) expect(["integer", "bigint"]).toContain(r.data_type);
  });

  it("rejects negative stock on insert", async () => {
    const msg = await rejects(
      db,
      `insert into product_variants (product_id, color, size, price, stock, weight_grams)
       select id, 'x', 'M', 1000, -1, 200 from products limit 1`,
    );
    expect(msg).toMatch(/stock/i);
  });

  it("rejects an update that would make stock negative", async () => {
    const msg = await rejects(db, "update product_variants set stock = stock - 100000");
    expect(msg).toMatch(/stock/i);
  });

  it("rejects negative price", async () => {
    const msg = await rejects(
      db,
      "update product_variants set price = -5 where id = (select id from product_variants limit 1)",
    );
    expect(msg).toMatch(/price/i);
  });

  it("rejects a duplicate color+size within one product", async () => {
    const msg = await rejects(
      db,
      `insert into product_variants (product_id, color, size, price, stock, weight_grams)
       select product_id, color, size, price, 1, 100 from product_variants limit 1`,
    );
    expect(msg).toMatch(/unique|duplicate/i);
  });

  it("rejects non-positive order item quantity", async () => {
    const order = await db.query<{ id: string }>(`${insertOrder("TKO-TEST-0001")} returning id`);
    const msg = await rejects(
      db,
      `insert into order_items (order_id, variant_id, product_name, variant_label, unit_price, quantity)
       values ('${order.rows[0].id}', '${await firstVariantId()}', 'n', 'l', 1000, 0)`,
    );
    expect(msg).toMatch(/quantity/i);
  });

  it("enforces unique order numbers", async () => {
    expect(await rejects(db, insertOrder("TKO-TEST-0001"))).toMatch(/unique|duplicate/i);
  });

  it("enforces unique payments.provider_reference to prevent double payment", async () => {
    const order = await db.query<{ id: string }>(
      "select id from orders where order_number = 'TKO-TEST-0001'",
    );
    const insert = `insert into payments (order_id, provider, provider_reference, amount, status)
                    values ('${order.rows[0].id}', 'duitku', 'REF-1', 1000, 'paid')`;
    await db.exec(insert);
    expect(await rejects(db, insert)).toMatch(/unique|duplicate/i);
  });

  it("rejects an invalid order status", async () => {
    expect(await rejects(db, "update orders set status = 'teleported'")).toMatch(/enum|invalid/i);
  });

  it("keeps updated_at fresh on update", async () => {
    await db.exec("update products set updated_at = now() - interval '1 day'");
    await db.exec(
      "update products set name = name || '' where id = (select id from products limit 1)",
    );
    const { rows } = await db.query<{ fresh: boolean }>(
      "select updated_at > now() - interval '1 minute' as fresh from products order by updated_at desc limit 1",
    );
    expect(rows[0].fresh).toBe(true);
  });

  it("indexes the hot lookup paths", async () => {
    const { rows } = await db.query<{ indexdef: string }>(
      "select indexdef from pg_indexes where schemaname = 'public'",
    );
    const defs = rows.map((r) => r.indexdef).join("\n");
    expect(defs).toMatch(/products .*\(slug\)/);
    expect(defs).toMatch(/products .*\(category_id, is_active\)/);
    expect(defs).toMatch(/product_variants .*\(product_id\)/);
    expect(defs).toMatch(/orders .*\(status, created_at\)/);
    expect(defs).toMatch(/payments .*\(order_id\)/);
    expect(defs).toMatch(/gin .*search_vector/);
  });
});
