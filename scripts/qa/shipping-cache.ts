/**
 * E4-AC2 evidence: 10 identical rate requests must cost at most one upstream call.
 * Needs a running app (`npm run dev` or a preview URL), migration 007 applied, and the store's
 * origin set in store_settings. Spends at most 2 RajaOngkir hits (1 destination search, 1 rates).
 * Usage: npm run qa:shipping-cache [-- http://localhost:3000]
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluateCacheRun } from "./shipping-qa.lib";

config({ path: ".env.local" });

const REQUESTS = 10;
const base = process.argv[2] ?? "http://localhost:3000";

async function usageTotal(sb: SupabaseClient, day: string): Promise<number> {
  const { data, error } = await sb
    .from("api_usage")
    .select("calls")
    .eq("provider", "rajaongkir")
    .eq("day", day);
  if (error) throw new Error(`api_usage read failed: ${error.message}`);
  return (data as Array<{ calls: number }>).reduce((sum, r) => sum + r.calls, 0);
}

async function main(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    process.stderr.write("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.\n");
    return 2;
  }
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  const { data: variant } = await sb.from("product_variants").select("id").limit(1).maybeSingle();
  if (!variant) {
    process.stderr.write("No product variants found. Run the seed first.\n");
    return 2;
  }
  const search = await fetch(`${base}/api/shipping/destinations?q=kebayoran`);
  const destination = ((await search.json()) as { destinations?: Array<{ id: string }> })
    .destinations?.[0];
  if (!destination) {
    process.stderr.write(`Destination search failed (HTTP ${search.status}).\n`);
    return 2;
  }

  const payload = JSON.stringify({
    destinationId: destination.id,
    items: [{ variantId: variant.id, quantity: 1 }],
  });
  const usageBefore = await usageTotal(sb, day);
  let failures = 0;
  for (let i = 0; i < REQUESTS; i++) {
    const response = await fetch(`${base}/api/shipping/rates`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" },
      body: payload,
    });
    if (!response.ok) failures++;
  }
  const usageAfter = await usageTotal(sb, day);

  process.stdout.write(
    `requests=${REQUESTS} failed=${failures} usage before=${usageBefore} after=${usageAfter}\n`,
  );
  if (failures > 0) {
    process.stderr.write(
      "Some requests failed; check the origin in store_settings and the app logs.\n",
    );
    return 1;
  }
  const report = evaluateCacheRun({ requests: REQUESTS, usageBefore, usageAfter });
  process.stdout.write(
    `${report.ok ? "Cache check PASSED" : "Cache check FAILED"}: ${report.message}\n`,
  );
  return report.ok ? 0 : 1;
}

main().then((code) => process.exit(code));
