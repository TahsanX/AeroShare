import { beforeEach, describe, expect, it, vi } from "vitest";
import { Redis } from "@upstash/redis";

vi.mock("@upstash/ratelimit", () => {
  const limit = vi.fn();
  class Ratelimit {
    static slidingWindow = vi.fn(() => ({}));
    static __limit = limit;
    limit = limit;
  }
  return { Ratelimit };
});

import { Ratelimit } from "@upstash/ratelimit";
import * as cache from "./cacheService";
import * as rl from "./rateLimitService";

const limitMock = (Ratelimit as unknown as { __limit: ReturnType<typeof vi.fn> }).__limit;

function fakeRedis(over: Partial<Record<"get" | "set" | "del", unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue("v"),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    ...over,
  } as unknown as Redis;
}

beforeEach(() => {
  vi.clearAllMocks();
  rl.resetRateLimitersForTests();
  cache.resetRedisForTests(undefined);
});

describe("cacheService", () => {
  it("uses dl:/meta: keys and ttl", async () => {
    const r = fakeRedis();
    cache.resetRedisForTests(r);
    await cache.setDownloadUrl("abc", "http://u", 30);
    expect(r.set).toHaveBeenCalledWith("dl:abc", "http://u", { ex: 30 });
    expect(await cache.getDownloadUrl("abc")).toBe("v");
    await cache.invalidate("abc");
    expect(r.del).toHaveBeenCalledWith("dl:abc", "meta:abc");
  });

  it("swallows failures", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const boom = vi.fn().mockRejectedValue(new Error("down"));
    cache.resetRedisForTests(fakeRedis({ get: boom, set: boom, del: boom }));
    expect(await cache.getMeta("x")).toBeNull();
    await expect(cache.setDownloadUrl("x", "u", 5)).resolves.toBeUndefined();
    await expect(cache.invalidate("x")).resolves.toBeUndefined();
  });

  it("is a no-op without redis", async () => {
    cache.resetRedisForTests(null);
    expect(await cache.getDownloadUrl("x")).toBeNull();
  });
});

describe("rateLimitService", () => {
  it("extracts client ip", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(rl.getClientIp(req)).toBe("1.2.3.4");
    expect(rl.getClientIp(new Request("http://x"))).toBe("unknown");
  });

  it("fails open without redis", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    cache.resetRedisForTests(null);
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const res = await rl.withRateLimit("init", handler)(new Request("http://x"));
    expect(await res.text()).toBe("ok");
  });

  it("returns 429 with Retry-After when limited", async () => {
    cache.resetRedisForTests(fakeRedis());
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 12_000 });
    const handler = vi.fn();
    const res = await rl.withRateLimit("init", handler)(new Request("http://x"));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(11);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes through when allowed", async () => {
    cache.resetRedisForTests(fakeRedis());
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 1000 });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const res = await rl.withRateLimit("download", handler)(new Request("http://x"));
    expect(res.status).toBe(200);
  });
});
