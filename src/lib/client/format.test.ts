import { describe, expect, it } from "vitest";
import { formatBytes, formatExpiry } from "./format";

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
  });
});

describe("formatExpiry", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("handles past, minutes, hours and days", () => {
    expect(formatExpiry("2025-12-31T00:00:00Z", now)).toBe("expired");
    expect(formatExpiry("2026-01-01T00:12:00Z", now)).toBe("in 12 minutes");
    expect(formatExpiry("2026-01-01T03:00:00Z", now)).toBe("in 3 hours");
    expect(formatExpiry("2026-01-07T00:00:00Z", now)).toBe("in 6 days");
  });
});
