import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/models/fileModel", () => ({
  listExpired: vi.fn(),
  listStalePending: vi.fn(),
  markDeleted: vi.fn(),
}));
vi.mock("@/server/services/cacheService", () => ({ invalidate: vi.fn() }));
vi.mock("@/server/services/storageService", () => ({
  deleteObject: vi.fn(),
  abortMultipart: vi.fn(),
  listStaleMultipart: vi.fn(),
}));

import * as fileModel from "@/server/models/fileModel";
import * as cache from "@/server/services/cacheService";
import * as storage from "@/server/services/storageService";
import { runCleanup } from "./cleanupController";

const SECRET = "s3cret-value";
const AUTH = `Bearer ${SECRET}`;
const r = (id: string, uploadId: string | null = null) =>
  ({ id, code: `code${id}`, storagePath: `p/${id}`, uploadId }) as never;

const original = process.env.CRON_SECRET;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.CRON_SECRET = SECRET;
  vi.mocked(fileModel.listExpired).mockResolvedValue([]);
  vi.mocked(fileModel.listStalePending).mockResolvedValue([]);
  vi.mocked(storage.listStaleMultipart).mockResolvedValue([]);
});
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe("cleanup auth", () => {
  it("rejects missing, wrong and malformed headers", async () => {
    for (const h of [null, "", "Bearer wrong", "Bearer ", SECRET, `Bearer ${SECRET}x`]) {
      await expect(runCleanup(h)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(fileModel.listExpired).not.toHaveBeenCalled();
  });

  it("rejects everything when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    await expect(runCleanup("Bearer ")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(runCleanup(AUTH)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts the valid secret", async () => {
    await expect(runCleanup(AUTH)).resolves.toEqual({
      expired: 0, stalePending: 0, staleMultipart: 0, errors: 0,
    });
  });
});

describe("cleanup work", () => {
  it("processes all three categories and counts", async () => {
    vi.mocked(fileModel.listExpired).mockResolvedValue([r("1"), r("2")]);
    vi.mocked(fileModel.listStalePending).mockResolvedValue([r("3", "up3")]);
    vi.mocked(storage.listStaleMultipart).mockResolvedValue([
      { path: "x", uploadId: "ux" },
      { path: "y", uploadId: "uy" },
    ]);
    const res = await runCleanup(AUTH);
    expect(res).toEqual({ expired: 2, stalePending: 1, staleMultipart: 2, errors: 0 });
    expect(storage.deleteObject).toHaveBeenCalledWith("p/1");
    expect(fileModel.markDeleted).toHaveBeenCalledWith("2");
    expect(cache.invalidate).toHaveBeenCalledWith("code1");
    expect(storage.abortMultipart).toHaveBeenCalledWith("p/3", "up3");
    expect(storage.abortMultipart).toHaveBeenCalledWith("x", "ux");
  });

  it("continues past errors and counts them", async () => {
    vi.mocked(fileModel.listExpired).mockResolvedValue([r("1"), r("2")]);
    vi.mocked(storage.deleteObject).mockRejectedValueOnce(new Error("boom"));
    vi.mocked(fileModel.listStalePending).mockRejectedValue(new Error("db"));
    vi.mocked(storage.listStaleMultipart).mockResolvedValue([{ path: "x", uploadId: "ux" }]);
    vi.mocked(storage.abortMultipart).mockRejectedValue(new Error("s3"));
    const res = await runCleanup(AUTH);
    expect(res).toEqual({ expired: 1, stalePending: 0, staleMultipart: 0, errors: 3 });
    expect(fileModel.markDeleted).toHaveBeenCalledTimes(1);
  });
});
