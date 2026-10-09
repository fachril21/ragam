import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parsePublicEnv, type PublicEnv } from "../env";

type PublicClientEnv = Pick<PublicEnv, "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY">;

/** Anon-key client for reading the storefront. Access is limited by RLS. */
export function createPublicClient(env: PublicClientEnv): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: SupabaseClient | undefined;

export function getPublicClient(): SupabaseClient {
  cached ??= createPublicClient(parsePublicEnv(process.env));
  return cached;
}
