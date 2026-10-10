import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createDb, rejects } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb({ seed: true });
});
afterAll(async () => {
  await db.close();
});

const one = async <T>(sql: string) => (await db.query<T>(sql)).rows[0];

describe("phase 3 tables are server-only", () => {
  it.each(["shipping_cache", "api_usage", "rate_limits"])(
    "anon and authenticated cannot read %s",
    async (table) => {
      await db.exec(`reset role`);
      for (const role of ["anon", "authenticated"] as const) {
        const err = await as(db, role, async () => {
          try {
            await db.query(`select * from ${table}`);
            return "";
          } catch (e) {
            return (e as Error).message;
          }
        });
        expect(err).toMatch(/permission denied/i);
      }
    },
  );

  it("anon cannot call the counters", async () => {
    const err = await as(db, "anon", async () => {
      try {
        await db.query("select consume_rate_limit('x', 1, 60)");
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(err).toMatch(/permission denied/i);
  });
});

describe("consume_rate_limit (E14)", () => {
  it("allows up to the maximum then blocks inside the window", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      results.push(
        (await one<{ ok: boolean }>("select consume_rate_limit('ip:1', 10, 60) as ok")).ok,
      );
    }
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results.slice(10)).toEqual([false, false]);
  });

  it("keeps buckets independent", async () => {
    expect((await one<{ ok: boolean }>("select consume_rate_limit('ip:2', 10, 60) as ok")).ok).toBe(
      true,
    );
  });

  it("starts a fresh window after it elapses", async () => {
    await db.exec(
      `update rate_limits set window_start = now() - interval '2 minutes' where bucket = 'ip:1'`,
    );
    expect((await one<{ ok: boolean }>("select consume_rate_limit('ip:1', 10, 60) as ok")).ok).toBe(
      true,
    );
  });

  it("rejects non-positive limits", async () => {
    expect(await rejects(db, "select consume_rate_limit('ip:3', 0, 60)")).toMatch(/invalid/i);
    expect(await rejects(db, "select consume_rate_limit('ip:3', 5, 0)")).toMatch(/invalid/i);
  });
});

describe("increment_api_usage (E4-AC3)", () => {
  it("accumulates calls and failures per day and returns today's total for the provider", async () => {
    await db.query("select increment_api_usage('rajaongkir', 'cost', false)");
    await db.query("select increment_api_usage('rajaongkir', 'cost', true)");
    const total = await one<{ total: number }>(
      "select increment_api_usage('rajaongkir', 'search', false) as total",
    );
    expect(Number(total.total)).toBe(3);
    const cost = await one<{ calls: number; failures: number }>(
      "select calls, failures from api_usage where endpoint = 'cost'",
    );
    expect(cost).toEqual({ calls: 2, failures: 1 });
  });

  it("does not mix providers", async () => {
    const total = await one<{ total: number }>(
      "select increment_api_usage('duitku', 'invoice', false) as total",
    );
    expect(Number(total.total)).toBe(1);
  });
});

describe("shipping_cache", () => {
  it("is keyed so a repeated write replaces the row", async () => {
    await db.exec(`
      insert into shipping_cache (key, kind, payload, expires_at)
      values ('k1', 'rates', '{"a":1}', now() + interval '30 minutes')
      on conflict (key) do update set payload = excluded.payload`);
    await db.exec(`
      insert into shipping_cache (key, kind, payload, expires_at)
      values ('k1', 'rates', '{"a":2}', now() + interval '30 minutes')
      on conflict (key) do update set payload = excluded.payload`);
    const row = await one<{ n: number; payload: { a: number } }>(
      "select count(*)::int as n, max(payload::text)::jsonb as payload from shipping_cache where key = 'k1'",
    );
    expect(row.n).toBe(1);
    expect(row.payload.a).toBe(2);
  });

  it("only accepts known kinds", async () => {
    expect(
      await rejects(
        db,
        "insert into shipping_cache (key, kind, payload, expires_at) values ('k2','bogus','{}', now())",
      ),
    ).toMatch(/kind/i);
  });
});
