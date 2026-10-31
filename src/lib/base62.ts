import { randomBytes } from "node:crypto";
import { SHORT_CODE_LENGTH } from "@/shared/contracts";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ZERO = BigInt(0);
const BASE = BigInt(ALPHABET.length);

export function encode(value: bigint): string {
  if (value < ZERO) throw new RangeError("base62: negative value");
  if (value === ZERO) return ALPHABET[0];
  let out = "";
  let n = value;
  while (n > ZERO) {
    out = ALPHABET[Number(n % BASE)] + out;
    n = n / BASE;
  }
  return out;
}

export function decode(str: string): bigint {
  if (!str) throw new RangeError("base62: empty string");
  let n = ZERO;
  for (const ch of str) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new RangeError(`base62: invalid character "${ch}"`);
    n = n * BASE + BigInt(i);
  }
  return n;
}

// 62^8 < 2^48, so draw 48 random bits and reject values that would need
// more than SHORT_CODE_LENGTH chars (unbiased, ~22% rejection).
let LIMIT = BigInt(1);
for (let i = 0; i < SHORT_CODE_LENGTH; i++) LIMIT = LIMIT * BASE;

/** 48-bit crypto-random value as a fixed-length Base62 string. */
export function generateCode(): string {
  for (;;) {
    const v = BigInt(`0x${randomBytes(6).toString("hex")}`);
    if (v < LIMIT) return encode(v).padStart(SHORT_CODE_LENGTH, ALPHABET[0]);
  }
}
