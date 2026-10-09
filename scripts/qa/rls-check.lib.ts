/** Tables that must never be readable with the anon key. */
export const SENSITIVE_TABLES = [
  "orders",
  "order_items",
  "payments",
  "shipments",
  "admin_profiles",
] as const;

/** Public catalog tables the anon key is expected to read (reported for context only). */
export const PUBLIC_TABLES = [
  "categories",
  "products",
  "product_variants",
  "product_images",
  "store_settings",
] as const;

export interface TableProbe {
  table: string;
  rows: number;
  error?: string;
}

export interface RlsReport {
  ok: boolean;
  failures: string[];
}

const isDenial = (error: string) =>
  /permission denied|row-level security|not authorized/i.test(error);

/**
 * A sensitive table passes when anon sees 0 rows or is explicitly denied.
 * Any other error (network, wrong key) is a failure so a broken probe never reads as "safe".
 */
export function evaluateRlsResults(probes: TableProbe[]): RlsReport {
  const failures: string[] = [];
  for (const p of probes) {
    if (!(SENSITIVE_TABLES as readonly string[]).includes(p.table)) continue;
    if (p.error && !isDenial(p.error)) failures.push(`${p.table}: probe failed (${p.error})`);
    else if (!p.error && p.rows > 0) failures.push(`${p.table}: anon can read ${p.rows} row(s)`);
  }
  return { ok: failures.length === 0, failures };
}
