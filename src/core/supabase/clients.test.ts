import { describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn((url: string, key: string, options?: unknown) => ({ url, key, options })),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { createPublicClient } from "./public";
import { createServiceClient } from "./server";

describe("createPublicClient", () => {
  it("uses the anon key and does not persist sessions", () => {
    createPublicClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://x.supabase.co",
      "anon",
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    );
  });
});

describe("createServiceClient", () => {
  it("uses the service role key and never persists sessions", () => {
    createServiceClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    });
    expect(createClient).toHaveBeenLastCalledWith(
      "https://x.supabase.co",
      "service",
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: false, autoRefreshToken: false }),
      }),
    );
  });

  it("throws a clear error when the service role key is missing", () => {
    expect(() =>
      createServiceClient({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
