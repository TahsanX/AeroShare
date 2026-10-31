import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeUploadResponseSchema,
  initUploadResponseSchema,
  MB,
} from "@/shared/contracts";

vi.mock("@/server/models/fileModel", () => ({
  create: vi.fn(),
  findByCode: vi.fn(),
  markReady: vi.fn(),
  markDeleted: vi.fn(),
}));
vi.mock("@/server/services/storageService", () => ({
  createSignedUploadUrl: vi.fn(),
  createMultipart: vi.fn(),
  presignParts: vi.fn(),
  completeMultipart: vi.fn(),
  abortMultipart: vi.fn(),
  objectExists: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock("@/server/services/cacheService", () => ({ invalidate: vi.fn() }));

import * as fileModel from "@/server/models/fileModel";
import * as storage from "@/server/services/storageService";
import * as cache from "@/server/services/cacheService";
import { abortUpload, completeUpload, initUpload } from "./uploadController";

const req = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });

const future = new Date(Date.now() + 3600_000).toISOString();
const rec = (over: Record<string, unknown> = {}) =>
  ({
    id: "id1",
    code: "Ab3dE9xZ",
    name: "a.bin",
    size: 10,
    mime: "application/octet-stream",
    storagePath: "u/p",
    uploadId: null,
    status: "pending",
    downloadCount: 0,
    createdAt: "",
    expiresAt: future,
    ...over,
  }) as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(fileModel.create).mockResolvedValue(rec());
});

describe("initUpload", () => {
  it("single mode", async () => {
    vi.mocked(storage.createSignedUploadUrl).mockResolvedValue({
      url: "https://s.example/up",
      token: "t",
      path: "p",
    });
    const res = await initUpload(req({ name: "a.bin", size: 1 * MB }));
    expect(initUploadResponseSchema.parse(res)).toMatchObject({
      mode: "single",
      code: "Ab3dE9xZ",
    });
    const input = vi.mocked(fileModel.create).mock.calls[0][0];
    expect(input.storagePath).toMatch(/^u\/[0-9a-f-]{36}$/);
    expect(input.storagePath).not.toContain("a.bin");
  });

  it("multipart mode", async () => {
    vi.mocked(storage.createMultipart).mockResolvedValue("up1");
    vi.mocked(storage.presignParts).mockResolvedValue([
      { partNumber: 1, url: "https://s.example/1" },
      { partNumber: 2, url: "https://s.example/2" },
    ]);
    const res = await initUpload(req({ name: "a.bin", size: 10 * MB }));
    expect(initUploadResponseSchema.parse(res)).toMatchObject({
      mode: "multipart",
      uploadId: "up1",
    });
    expect(vi.mocked(storage.presignParts).mock.calls[0][2]).toBe(2);
    expect(vi.mocked(fileModel.create).mock.calls[0][0].uploadId).toBe("up1");
  });

  it("rejects too large", async () => {
    await expect(initUpload(req({ name: "a", size: 51 * MB }))).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
    expect(fileModel.create).not.toHaveBeenCalled();
  });

  it("rejects invalid body and bad JSON", async () => {
    await expect(initUpload(req({ size: 5 }))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(
      initUpload(new Request("http://x", { method: "POST", body: "{" })),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("cleans up when presign fails (multipart)", async () => {
    vi.mocked(storage.createMultipart).mockResolvedValue("up1");
    vi.mocked(storage.presignParts).mockRejectedValue(new Error("boom"));
    await expect(initUpload(req({ name: "a", size: 10 * MB }))).rejects.toThrow("boom");
    expect(storage.abortMultipart).toHaveBeenCalledWith(expect.any(String), "up1");
    expect(fileModel.markDeleted).toHaveBeenCalledWith("id1");
  });

  it("cleans up when signing fails (single)", async () => {
    vi.mocked(storage.createSignedUploadUrl).mockRejectedValue(new Error("boom"));
    await expect(initUpload(req({ name: "a", size: 1 }))).rejects.toThrow("boom");
    expect(fileModel.markDeleted).toHaveBeenCalledWith("id1");
  });

  it("aborts multipart when DB insert fails", async () => {
    vi.mocked(storage.createMultipart).mockResolvedValue("up1");
    vi.mocked(fileModel.create).mockRejectedValue(new Error("db"));
    await expect(initUpload(req({ name: "a", size: 10 * MB }))).rejects.toThrow("db");
    expect(storage.abortMultipart).toHaveBeenCalled();
  });
});

describe("completeUpload", () => {
  it("completes a single upload", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    vi.mocked(storage.objectExists).mockResolvedValue(true);
    const res = await completeUpload(req({ code: "Ab3dE9xZ" }));
    expect(completeUploadResponseSchema.parse(res).sharePath).toBe("/s/Ab3dE9xZ");
    expect(fileModel.markReady).toHaveBeenCalledWith("id1");
    expect(cache.invalidate).toHaveBeenCalledWith("Ab3dE9xZ");
  });

  it("completes a multipart upload", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ uploadId: "up1" }));
    await completeUpload(req({ code: "Ab3dE9xZ" }));
    expect(storage.completeMultipart).toHaveBeenCalledWith("u/p", "up1");
    expect(fileModel.markReady).toHaveBeenCalled();
  });

  it("fails when the object is missing", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    vi.mocked(storage.objectExists).mockResolvedValue(false);
    await expect(completeUpload(req({ code: "x" }))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(fileModel.markReady).not.toHaveBeenCalled();
  });

  it("is idempotent when already ready", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ status: "ready" }));
    const res = await completeUpload(req({ code: "x" }));
    expect(res.code).toBe("Ab3dE9xZ");
    expect(storage.objectExists).not.toHaveBeenCalled();
    expect(fileModel.markReady).not.toHaveBeenCalled();
  });

  it("rejects deleted, unknown and invalid", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ status: "deleted" }));
    await expect(completeUpload(req({ code: "x" }))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    vi.mocked(fileModel.findByCode).mockResolvedValue(null);
    await expect(completeUpload(req({ code: "x" }))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(completeUpload(req({}))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("abortUpload", () => {
  it("aborts a pending multipart upload", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ uploadId: "up1" }));
    expect(await abortUpload(req({ code: "x" }))).toEqual({ ok: true });
    expect(storage.abortMultipart).toHaveBeenCalledWith("u/p", "up1");
    expect(storage.deleteObject).toHaveBeenCalledWith("u/p");
    expect(fileModel.markDeleted).toHaveBeenCalledWith("id1");
  });

  it("denies abort on ready files", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ status: "ready" }));
    await expect(abortUpload(req({ code: "x" }))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(fileModel.markDeleted).not.toHaveBeenCalled();
  });

  it("still marks deleted when storage cleanup fails", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    vi.mocked(storage.deleteObject).mockRejectedValue(new Error("s3"));
    await abortUpload(req({ code: "x" }));
    expect(fileModel.markDeleted).toHaveBeenCalled();
  });
});
