import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN_ID, USER_ID, as, createDb, rejects } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb({ seed: true });
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN_ID}', 'admin@x.co'), ('${USER_ID}', 'user@x.co');
    insert into admin_profiles (user_id, display_name) values ('${ADMIN_ID}', 'Admin');
    insert into orders (order_number, customer_name, phone, email, address, subtotal, shipping_cost, total)
      values ('TKO-RLS-0001','A','628111','a@b.co','x',1000,0,1000);
    insert into shipments (order_id, courier) select id, 'jne' from orders;
    insert into payments (order_id, provider, provider_reference, amount, status)
      select id, 'duitku', 'RLS-REF', 1000, 'pending' from orders;
    insert into order_items (order_id, variant_id, product_name, variant_label, unit_price, quantity)
      select o.id, v.id, 'n', 'l', 1000, 1 from orders o, product_variants v limit 1;
    update products set is_active = false where id = (select id from products order by slug limit 1);
  `);
});
afterAll(async () => {
  await db.close();
});

const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows;
const countOf = async (sql: string) => (await rows<{ n: number }>(sql))[0].n;

/** Row count a role can see, treating "permission denied" as zero rows. */
async function visibleRows(table: string): Promise<number> {
  try {
    return (await rows(`select * from ${table}`)).length;
  } catch (e) {
    if (/permission denied/i.test((e as Error).message)) return 0;
    throw e;
  }
}

describe("E0-AC4: anon can only read public catalog data", () => {
  it.each(["orders", "order_items", "payments", "shipments", "admin_profiles"])(
    "returns no rows or is denied for %s",
    async (table) => {
      expect(await as(db, "anon", () => visibleRows(table))).toBe(0);
    },
  );

  it("sees only active products", async () => {
    const total = await countOf("select count(*)::int n from products");
    const visible = await as(db, "anon", () => countOf("select count(*)::int n from products"));
    expect(visible).toBe(total - 1);
  });

  it("does not see variants or images of inactive products", async () => {
    const all = await countOf("select count(*)::int n from product_variants");
    const visible = await as(db, "anon", () =>
      countOf("select count(*)::int n from product_variants"),
    );
    expect(visible).toBeLessThan(all);
    const leaked = await as(db, "anon", () =>
      countOf(`select count(*)::int n from product_variants v
               join products p on p.id = v.product_id where not p.is_active`),
    );
    expect(leaked).toBe(0);
  });

  it("can read public store_settings columns", async () => {
    const r = await as(db, "anon", () => rows("select name, whatsapp from store_settings"));
    expect(r).toHaveLength(1);
  });

  it("cannot read internal store_settings columns", async () => {
    const msg = await as(db, "anon", () =>
      rejects(db, "select api_daily_limit from store_settings"),
    );
    expect(msg).toMatch(/permission denied/i);
  });

  it.each([
    "insert into categories (name, slug) values ('x','x')",
    "insert into orders (order_number, customer_name, phone, email, address, subtotal, shipping_cost, total) values ('Z','a','1','a@b.co','x',1,0,1)",
  ])("cannot insert: %s", async (sql) => {
    await as(db, "anon", async () => {
      await rejects(db, sql);
    });
  });

  it.each([
    [
      "products",
      "update products set name = 'hacked'",
      "select count(*)::int n from products where name = 'hacked'",
    ],
    [
      "store_settings",
      "update store_settings set name = 'hacked'",
      "select count(*)::int n from store_settings where name = 'hacked'",
    ],
  ])("cannot update %s", async (_t, update, check) => {
    await as(db, "anon", async () => {
      await db.exec(update).catch(() => undefined);
    });
    expect(await countOf(check)).toBe(0);
  });

  it("cannot delete variants", async () => {
    const before = await countOf("select count(*)::int n from product_variants");
    await as(db, "anon", async () => {
      await db.exec("delete from product_variants").catch(() => undefined);
    });
    expect(await countOf("select count(*)::int n from product_variants")).toBe(before);
  });
});

describe("authenticated non-admin users get no extra access", () => {
  it("cannot read orders", async () => {
    expect(await as(db, "authenticated", () => visibleRows("orders"), USER_ID)).toBe(0);
  });

  it("cannot write the catalog", async () => {
    await as(
      db,
      "authenticated",
      async () => {
        await db.exec("update products set name = 'hacked'").catch(() => undefined);
        await rejects(db, "insert into categories (name, slug) values ('x','x')");
      },
      USER_ID,
    );
    expect(await countOf("select count(*)::int n from products where name = 'hacked'")).toBe(0);
  });
});

describe("admins (rows in admin_profiles) can manage the catalog", () => {
  it("can insert a category and see inactive products", async () => {
    await as(
      db,
      "authenticated",
      async () => {
        await db.exec("insert into categories (name, slug) values ('Baru','baru')");
        expect(await countOf("select count(*)::int n from products where not is_active")).toBe(1);
      },
      ADMIN_ID,
    );
  });

  it("can update store_settings including internal columns", async () => {
    await as(
      db,
      "authenticated",
      async () => {
        await db.exec("update store_settings set api_daily_limit = 500");
        const r = await rows<{ api_daily_limit: number }>(
          "select api_daily_limit from store_settings",
        );
        expect(r[0].api_daily_limit).toBe(500);
      },
      ADMIN_ID,
    );
  });
});

describe("service_role", () => {
  it("bypasses RLS and reads orders", async () => {
    const r = await as(db, "service_role", () => rows("select order_number from orders"));
    expect(r).toHaveLength(1);
  });
});

describe("storage policies", () => {
  it("lets anon read but not write product images", async () => {
    await as(db, "anon", async () => {
      await rows("select * from storage.objects");
      const msg = await rejects(
        db,
        "insert into storage.objects (bucket_id, name) values ('product-images','x.webp')",
      );
      expect(msg).toMatch(/row-level security|permission denied/i);
    });
  });

  it("lets admin write product images", async () => {
    await as(
      db,
      "authenticated",
      async () => {
        await db.exec(
          "insert into storage.objects (bucket_id, name) values ('product-images','ok.webp')",
        );
      },
      ADMIN_ID,
    );
  });
});
