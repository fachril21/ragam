import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseServerEnv } from "../env";

interface ServiceClientEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

/**
 * Service-role client: bypasses RLS. Server-only (route handlers, server actions, jobs).
 * Never import this from a client component; tests/architecture.test.ts enforces it.
 */
export function createServiceClient(env: ServiceClientEnv): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to create the service client");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: SupabaseClient | undefined;

export function getServiceClient(): SupabaseClient {
  cached ??= createServiceClient(parseServerEnv(process.env));
  return cached;
}
