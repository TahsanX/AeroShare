import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().min(1).default("uploads"),
  SUPABASE_S3_ENDPOINT: z.string().url(),
  SUPABASE_S3_REGION: z.string().min(1),
  SUPABASE_S3_ACCESS_KEY_ID: z.string().min(1),
  SUPABASE_S3_SECRET_ACCESS_KEY: z.string().min(1),
  // Optional: cache and rate limiting degrade gracefully without Redis.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Lazily validated env. Throws only when called with invalid config. */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  // Treat empty strings (from a copied .env.example) as unset.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== ""),
  );
  cached = serverEnvSchema.parse(raw);
  return cached;
}

/** Test helper. */
export function resetEnvCache(): void {
  cached = undefined;
}
