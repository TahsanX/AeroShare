import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { errorBody } from "@/lib/errors";
import { HTTP_STATUS } from "@/shared/contracts";
import { getRedis } from "./cacheService";

export const RATE_POLICIES = {
  init: { limit: 10, window: "1 m" },
  complete: { limit: 30, window: "1 m" },
  abort: { limit: 30, window: "1 m" },
  download: { limit: 60, window: "1 m" },
  metadata: { limit: 120, window: "1 m" },
} as const;

export type RatePolicy = keyof typeof RATE_POLICIES;

const limiters = new Map<RatePolicy, Ratelimit>();
let warned = false;

function getLimiter(policy: RatePolicy): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    if (!warned) {
      warned = true;
      console.warn("[rate-limit] Upstash Redis not configured; failing open.");
    }
    return null;
  }
  let l = limiters.get(policy);
  if (!l) {
    const { limit, window } = RATE_POLICIES[policy];
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rl:${policy}`,
    });
    limiters.set(policy, l);
  }
  return l;
}

/** Test helper. */
export function resetRateLimitersForTests(): void {
  limiters.clear();
  warned = false;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = { success: boolean; retryAfterSec: number };

/** Fails open on missing Redis or Redis errors. */
export async function checkRateLimit(
  policy: RatePolicy,
  ip: string,
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter(policy);
    if (!limiter) return { success: true, retryAfterSec: 0 };
    const res = await limiter.limit(ip);
    return {
      success: res.success,
      retryAfterSec: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
    };
  } catch (e) {
    console.warn("[rate-limit] check failed; failing open", e);
    return { success: true, retryAfterSec: 0 };
  }
}

type Handler<A extends unknown[]> = (request: Request, ...args: A) => Promise<Response> | Response;

/** Wraps a route handler; responds 429 + Retry-After when over the limit. */
export function withRateLimit<A extends unknown[]>(
  policy: RatePolicy,
  handler: Handler<A>,
): Handler<A> {
  return async (request, ...args) => {
    const result = await checkRateLimit(policy, getClientIp(request));
    if (!result.success) {
      return NextResponse.json(
        errorBody("RATE_LIMITED", "Too many requests, slow down."),
        {
          status: HTTP_STATUS.RATE_LIMITED,
          headers: { "Retry-After": String(result.retryAfterSec) },
        },
      );
    }
    return handler(request, ...args);
  };
}
