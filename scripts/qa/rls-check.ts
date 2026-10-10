/**
 * E0-AC4 evidence: tries to read every table with the anon key.
 * Usage: npm run qa:rls   (reads NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY from .env.local or the environment)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_TABLES,
  SENSITIVE_TABLES,
  evaluateRlsResults,
  type TableProbe,
} from "./rls-check.lib";

config({ path: ".env.local" });

async function main(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    process.stderr.write("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.\n");
    return 2;
  }

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const probes: TableProbe[] = [];
  for (const table of [...SENSITIVE_TABLES, ...PUBLIC_TABLES]) {
    const { data, error } = await client.from(table).select("*").limit(5);
    probes.push({ table, rows: data?.length ?? 0, error: error?.message });
  }

  const lines = probes.map(
    (p) =>
      `${p.table.padEnd(18)} rows=${String(p.rows).padEnd(3)} ${p.error ? `error="${p.error}"` : ""}`,
  );
  process.stdout.write(`${lines.join("\n")}\n\n`);

  const report = evaluateRlsResults(probes);
  if (report.ok) {
    process.stdout.write("RLS check PASSED: no sensitive table is readable with the anon key.\n");
    return 0;
  }
  process.stderr.write(`RLS check FAILED:\n${report.failures.map((f) => `  - ${f}`).join("\n")}\n`);
  return 1;
}

main().then((code) => process.exit(code));
