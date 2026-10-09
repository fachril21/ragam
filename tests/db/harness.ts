import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

export const ADMIN_ID = "00000000-0000-4000-8000-0000000000a1";
export const USER_ID = "00000000-0000-4000-8000-0000000000b2";

export type Role = "anon" | "authenticated" | "service_role" | "postgres";

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function createDb(options: { seed?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  if (options.seed) await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  return db;
}

/** Runs `fn` with the session switched to `role` (and optionally an authenticated user id). */
export async function as<T>(
  db: PGlite,
  role: Role,
  fn: () => Promise<T>,
  userId?: string,
): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', false)`);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Executes a statement that must fail; returns the error message. */
export async function rejects(db: PGlite, sql: string): Promise<string> {
  try {
    await db.exec(sql);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`Expected statement to fail but it succeeded: ${sql}`);
}
