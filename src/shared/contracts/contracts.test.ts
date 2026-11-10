import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE,
  MAX_PARTS,
  initUploadRequestSchema,
  initUploadResponseSchema,
} from "./index";

describe("upload contracts", () => {
  it("rejects files over the size limit", () => {
    const r = initUploadRequestSchema.safeParse({ name: "a.bin", size: MAX_FILE_SIZE + 1 });
    expect(r.success).toBe(false);
  });

  it("applies defaults for mime and expiry", () => {
    const r = initUploadRequestSchema.parse({ name: "a.bin", size: 10 });
    expect(r.mime).toBe("application/octet-stream");
    expect(r.expiresIn).toBe("7d");
  });

  it("parses a multipart init response", () => {
    const r = initUploadResponseSchema.safeParse({
      mode: "multipart",
      code: "Ab3dE9xZ",
      uploadId: "u1",
      partSize: 8 * 1024 * 1024,
      parts: [{ partNumber: 1, url: "https://example.com/p1" }],
    });
    expect(r.success).toBe(true);
  });

  it("caps a 50MB file at 7 parts", () => {
    expect(MAX_PARTS).toBe(7);
  });
});
