import { describe, expect, it } from "vitest";
import { mapApiFailure, parseRetryAfter } from "./downloader";

const err = (code: string) => ({ error: { code, message: "m" } });

describe("parseRetryAfter", () => {
  it("parses seconds", () => expect(parseRetryAfter("12")).toBe(12));
  it("rounds up", () => expect(parseRetryAfter("1.2")).toBe(2));
  it("falls back", () => {
    expect(parseRetryAfter(null)).toBe(30);
    expect(parseRetryAfter("abc")).toBe(30);
    expect(parseRetryAfter("0")).toBe(30);
  });
});

describe("mapApiFailure", () => {
  it("maps not found", () =>
    expect(mapApiFailure(404, err("NOT_FOUND"))).toEqual({ kind: "not-found" }));
  it("maps expired", () =>
    expect(mapApiFailure(410, err("EXPIRED"))).toEqual({ kind: "expired" }));
  it("maps rate limit with header", () =>
    expect(mapApiFailure(429, err("RATE_LIMITED"), "7")).toEqual({
      kind: "rate-limited",
      retryAfterSeconds: 7,
    }));
  it("uses status when body is unparseable", () => {
    expect(mapApiFailure(404, undefined)).toEqual({ kind: "not-found" });
    expect(mapApiFailure(410, "x")).toEqual({ kind: "expired" });
  });
  it("maps other errors to a message", () => {
    expect(mapApiFailure(500, err("INTERNAL_ERROR"))).toEqual({ kind: "error", message: "m" });
    expect(mapApiFailure(502, undefined)).toEqual({
      kind: "error",
      message: "Something went wrong.",
    });
  });
});
