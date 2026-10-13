/**
 * E4-AC6 evidence: scans the client bundle (.next/static) for secret values from the environment.
 * Usage: npm run build && npm run qa:bundle-secrets
 */
import { config } from "dotenv";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findLeakedSecrets, type ScannedFile } from "./shipping-qa.lib";

config({ path: ".env.local" });

const SECRET_NAMES = [
  "RAJAONGKIR_API_KEY",
  "DUITKU_API_KEY",
  "DUITKU_MERCHANT_CODE",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JOB_SECRET_TOKEN",
  "REVALIDATE_SECRET_TOKEN",
];
const ROOT = join(".next", "static");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function main(): number {
  try {
    statSync(ROOT);
  } catch {
    process.stderr.write("No .next/static found. Run `npm run build` first.\n");
    return 2;
  }
  const files: ScannedFile[] = walk(ROOT)
    .filter((f) => /\.(js|css|html|json|txt|map)$/.test(f))
    .map((f) => ({ path: relative(".next", f), content: readFileSync(f, "utf8") }));
  const secrets = SECRET_NAMES.map((name) => ({ name, value: process.env[name] }));
  const checked = secrets.filter((s) => s.value && s.value.length >= 8).map((s) => s.name);

  process.stdout.write(
    `Scanned ${files.length} client file(s) for: ${checked.join(", ") || "(none set)"}\n`,
  );
  if (checked.length === 0) {
    process.stderr.write("No secret values in the environment, so nothing could be checked.\n");
    return 2;
  }
  const leaks = findLeakedSecrets(files, secrets);
  if (leaks.length === 0) {
    process.stdout.write("Bundle scan PASSED: no secret value found in the client bundle.\n");
    return 0;
  }
  for (const leak of leaks) process.stderr.write(`LEAK: ${leak.name} found in ${leak.path}\n`);
  process.stderr.write("Bundle scan FAILED.\n");
  return 1;
}

process.exit(main());
