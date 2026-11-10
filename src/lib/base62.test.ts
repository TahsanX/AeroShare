import { describe, expect, it } from "vitest";
import { SHORT_CODE_LENGTH } from "@/shared/contracts";
import { decode, encode, generateCode } from "./base62";

describe("base62", () => {
  it("roundtrips", () => {
    for (const v of [0, 1, 61, 62, 123456789, 281474976710655].map(BigInt)) {
      expect(decode(encode(v))).toBe(v);
    }
  });
  it("rejects bad input", () => {
    expect(() => decode("ab-")).toThrow();
    expect(() => encode(BigInt(-1))).toThrow();
  });
  it("generates fixed-length base62 codes", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toHaveLength(SHORT_CODE_LENGTH);
      expect(c).toMatch(/^[0-9A-Za-z]+$/);
    }
  });
  it("is unique over a sample", () => {
    const s = new Set(Array.from({ length: 5000 }, generateCode));
    expect(s.size).toBe(5000);
  });
});
