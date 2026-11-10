import { afterEach, describe, expect, it } from "vitest";
import { getEnv, resetEnvCache } from "./env";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  resetEnvCache();
});

describe("env", () => {
  it("throws lazily when invalid, not at import", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getEnv()).toThrow();
  });
  it("parses valid config with defaults", () => {
    Object.assign(process.env, {
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "k",
      SUPABASE_S3_ENDPOINT: "https://x.supabase.co/storage/v1/s3",
      SUPABASE_S3_REGION: "us-east-1",
      SUPABASE_S3_ACCESS_KEY_ID: "a",
      SUPABASE_S3_SECRET_ACCESS_KEY: "b",
      SUPABASE_BUCKET: "",
    });
    delete process.env.UPSTASH_REDIS_REST_URL;
    const env = getEnv();
    expect(env.SUPABASE_BUCKET).toBe("uploads");
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });
});
