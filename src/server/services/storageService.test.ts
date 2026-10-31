import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const storage = {
  createSignedUploadUrl: vi.fn(),
  createSignedUrl: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
};

vi.mock("@aws-sdk/client-s3", () => {
  const cmd = (name: string) =>
    class {
      name = name;
      constructor(public input: Record<string, unknown>) {}
    };
  return {
    S3Client: class {
      send = send;
    },
    CreateMultipartUploadCommand: cmd("Create"),
    UploadPartCommand: cmd("UploadPart"),
    ListPartsCommand: cmd("ListParts"),
    CompleteMultipartUploadCommand: cmd("Complete"),
    AbortMultipartUploadCommand: cmd("Abort"),
    ListMultipartUploadsCommand: cmd("ListUploads"),
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(
    async (_c: unknown, command: { input: { PartNumber: number } }) =>
      `https://s3.test/part/${command.input.PartNumber}`,
  ),
}));
vi.mock("./supabaseClient", () => ({
  getSupabase: () => ({ storage: { from: () => storage } }),
  getBucketName: () => "uploads",
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    SUPABASE_S3_ENDPOINT: "https://x/s3",
    SUPABASE_S3_REGION: "r",
    SUPABASE_S3_ACCESS_KEY_ID: "a",
    SUPABASE_S3_SECRET_ACCESS_KEY: "b",
  }),
}));

import * as storageService from "./storageService";

beforeEach(() => vi.clearAllMocks());

describe("storageService", () => {
  it("creates signed upload url", async () => {
    storage.createSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: "https://u", token: "t", path: "p" },
      error: null,
    });
    expect(await storageService.createSignedUploadUrl("p")).toEqual({
      url: "https://u",
      token: "t",
      path: "p",
    });
  });

  it("throws AppError on storage failure", async () => {
    storage.createSignedUrl.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(storageService.createSignedDownloadUrl("p", 60)).rejects.toThrow();
  });

  it("objectExists / deleteObject", async () => {
    storage.exists.mockResolvedValue({ data: true, error: null });
    expect(await storageService.objectExists("p")).toBe(true);
    storage.remove.mockResolvedValue({ error: null });
    await storageService.deleteObject("p");
    expect(storage.remove).toHaveBeenCalledWith(["p"]);
  });

  it("presigns numbered parts", async () => {
    const parts = await storageService.presignParts("p", "u", 3, 600);
    expect(parts.map((x) => x.partNumber)).toEqual([1, 2, 3]);
    expect(parts[2].url).toContain("/3");
  });

  it("completes using ListParts etags, sorted", async () => {
    send
      .mockResolvedValueOnce({
        Parts: [
          { PartNumber: 2, ETag: "b" },
          { PartNumber: 1, ETag: "a" },
        ],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});
    await storageService.completeMultipart("p", "u");
    const completeCmd = send.mock.calls[1][0];
    expect(completeCmd.input.MultipartUpload.Parts).toEqual([
      { PartNumber: 1, ETag: "a" },
      { PartNumber: 2, ETag: "b" },
    ]);
  });

  it("rejects completion with no parts", async () => {
    send.mockResolvedValueOnce({ Parts: [], IsTruncated: false });
    await expect(storageService.completeMultipart("p", "u")).rejects.toThrow();
  });

  it("lists only stale multipart uploads", async () => {
    send.mockResolvedValueOnce({
      Uploads: [
        { Key: "old", UploadId: "1", Initiated: new Date(Date.now() - 3 * 86400_000) },
        { Key: "new", UploadId: "2", Initiated: new Date() },
      ],
      IsTruncated: false,
    });
    const stale = await storageService.listStaleMultipart();
    expect(stale.map((s) => s.path)).toEqual(["old"]);
  });
});
