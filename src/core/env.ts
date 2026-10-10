import { z } from "zod";

/**
 * Environment validation. The app fails fast with every problem listed at once.
 * Third-party keys (Duitku, RajaOngkir, alerts) are optional until their phase needs
 * them; an empty string in `.env` counts as "not set yet".
 */

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const secretToken = z.string().min(16, "must be at least 16 characters");

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_ANALYTICS_ID: optional(z.string().min(1)),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JOB_SECRET_TOKEN: secretToken,
  REVALIDATE_SECRET_TOKEN: secretToken,
  DUITKU_MERCHANT_CODE: optional(z.string().min(1)),
  DUITKU_API_KEY: optional(z.string().min(1)),
  DUITKU_ENV: z.preprocess(emptyToUndefined, z.enum(["sandbox", "production"]).default("sandbox")),
  RAJAONGKIR_API_KEY: optional(z.string().min(1)),
  RAJAONGKIR_BASE_URL: optional(z.url()),
  ALERT_WEBHOOK_URL: optional(z.url()),
  TELEGRAM_BOT_TOKEN: optional(z.string().min(1)),
  TELEGRAM_CHAT_ID: optional(z.string().min(1)),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

type RawEnv = Record<string, string | undefined>;

function parse<S extends z.ZodType>(schema: S, source: RawEnv, label: string): z.infer<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const lines = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid ${label} environment variables:\n${lines.join("\n")}`);
}

export function parsePublicEnv(source: RawEnv): PublicEnv {
  return parse(publicSchema, source, "public");
}

export function parseServerEnv(source: RawEnv): ServerEnv {
  return parse(serverSchema, source, "server");
}
