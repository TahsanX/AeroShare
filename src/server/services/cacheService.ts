import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";
import type { FileMeta } from "@/shared/contracts";

let redis: Redis | null | undefined;

/** Shared Redis client, or null when Upstash is not configured. */
export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  try {
    const env = getEnv();
    redis =
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null;
  } catch {
    redis = null;
  }
  return redis;
}

/** Test helper. */
export function resetRedisForTests(client?: Redis | null): void {
  redis = client;
}

export const META_TTL_SEC = 60;

const dlKey = (code: string) => `dl:${code}`;
const metaKey = (code: string) => `meta:${code}`;

// ---- generic best-effort helpers (never throw) ----

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    return (await r.get<T>(key)) ?? null;
  } catch (e) {
    console.warn("cache get failed", e);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.set(key, value, { ex: Math.max(1, Math.floor(ttlSec)) });
  } catch (e) {
    console.warn("cache set failed", e);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const r = getRedis();
    if (!r || keys.length === 0) return;
    await r.del(...keys);
  } catch (e) {
    console.warn("cache del failed", e);
  }
}

// ---- domain helpers ----

export const getDownloadUrl = (code: string) => cacheGet<string>(dlKey(code));
export const setDownloadUrl = (code: string, url: string, ttl: number) =>
  cacheSet(dlKey(code), url, ttl);

export const getMeta = (code: string) => cacheGet<FileMeta>(metaKey(code));
export const setMeta = (code: string, meta: FileMeta, ttl: number = META_TTL_SEC) =>
  cacheSet(metaKey(code), meta, ttl);

export const invalidate = (code: string) => cacheDel(dlKey(code), metaKey(code));
