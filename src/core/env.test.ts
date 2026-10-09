import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://ragam.vercel.app",
};

const validServer = {
  ...validPublic,
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  JOB_SECRET_TOKEN: "job-secret-0123456789",
  REVALIDATE_SECRET_TOKEN: "revalidate-secret-0123456789",
};

describe("parsePublicEnv", () => {
  it("returns typed values when all public variables are present", () => {
    expect(parsePublicEnv(validPublic).NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc.supabase.co");
  });

  it("names every missing variable in one error", () => {
    expect(() => parsePublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SUPABASE_URL: "nope" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("treats the analytics id as optional", () => {
    expect(parsePublicEnv(validPublic).NEXT_PUBLIC_ANALYTICS_ID).toBeUndefined();
  });
});

describe("parseServerEnv", () => {
  it("fails fast with a clear message when the service role key is missing", () => {
    const rest: Record<string, string> = { ...validServer };
    delete rest.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => parseServerEnv(rest)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("leaves third-party keys optional so the app boots before the user supplies them", () => {
    const env = parseServerEnv(validServer);
    expect(env.DUITKU_API_KEY).toBeUndefined();
    expect(env.RAJAONGKIR_API_KEY).toBeUndefined();
  });

  it("defaults DUITKU_ENV to sandbox", () => {
    expect(parseServerEnv(validServer).DUITKU_ENV).toBe("sandbox");
  });

  it("rejects an unknown DUITKU_ENV", () => {
    expect(() => parseServerEnv({ ...validServer, DUITKU_ENV: "live" })).toThrow(/DUITKU_ENV/);
  });

  it("treats empty-string placeholders from .env as missing optional values", () => {
    const env = parseServerEnv({ ...validServer, DUITKU_API_KEY: "" });
    expect(env.DUITKU_API_KEY).toBeUndefined();
  });

  it("requires secret tokens to be at least 16 characters outside placeholders", () => {
    expect(() => parseServerEnv({ ...validServer, JOB_SECRET_TOKEN: "short" })).toThrow(
      /JOB_SECRET_TOKEN/,
    );
  });
});
