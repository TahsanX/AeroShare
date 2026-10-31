import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/models/fileModel", () => ({
  findByCode: vi.fn(),
  incrementDownload: vi.fn(),
  recordToMeta: (r: { code: string; name: string; size: number; mime: string; expiresAt: string }) => ({
    code: r.code,
    name: r.name,
    size: r.size,
    mime: r.mime,
    expiresAt: r.expiresAt,
  }),
}));
vi.mock("@/server/services/cacheService", () => ({
  getMeta: vi.fn(),
  setMeta: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock("@/server/services/storageService", () => ({
  createSignedDownloadUrl: vi.fn(),
}));

import * as fileModel from "@/server/models/fileModel";
import * as cache from "@/server/services/cacheService";
import { createSignedDownloadUrl } from "@/server/services/storageService";
import { getDownload, getFileMeta } from "./downloadController";

const CODE = "abcd1234";
const future = (sec: number) => new Date(Date.now() + sec * 1000).toISOString();

const rec = (over: Record<string, unknown> = {}) =>
  ({
    id: "1",
    code: CODE,
    name: "a.txt",
    size: 5,
    mime: "text/plain",
    storagePath: "p/a.txt",
    uploadId: null,
    status: "ready",
    downloadCount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: future(86400),
    ...over,
  }) as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cache.getMeta).mockResolvedValue(null);
  vi.mocked(cache.cacheGet).mockResolvedValue(null);
  vi.mocked(createSignedDownloadUrl).mockResolvedValue("https://signed/url");
});

describe("getFileMeta", () => {
  it("returns cached meta without hitting the DB", async () => {
    const meta = { code: CODE, name: "a", size: 1, mime: "x", expiresAt: future(100) };
    vi.mocked(cache.getMeta).mockResolvedValue(meta);
    expect(await getFileMeta(CODE)).toEqual(meta);
    expect(fileModel.findByCode).not.toHaveBeenCalled();
  });

  it("410 when cached meta is expired", async () => {
    vi.mocked(cache.getMeta).mockResolvedValue({
      code: CODE, name: "a", size: 1, mime: "x", expiresAt: future(-5),
    });
    await expect(getFileMeta(CODE)).rejects.toMatchObject({ code: "EXPIRED" });
  });

  it("populates cache with ttl <= 60", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    const meta = await getFileMeta(CODE);
    expect(meta.code).toBe(CODE);
    expect(cache.setMeta).toHaveBeenCalledWith(CODE, meta, 60);
  });

  it("caps ttl at remaining lifetime", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ expiresAt: future(20) }));
    await getFileMeta(CODE);
    const ttl = vi.mocked(cache.setMeta).mock.calls[0][2] as number;
    expect(ttl).toBeGreaterThanOrEqual(18);
    expect(ttl).toBeLessThanOrEqual(20);
  });

  it("404 for missing, pending, deleted and malformed codes", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(null);
    await expect(getFileMeta(CODE)).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ status: "pending" }));
    await expect(getFileMeta(CODE)).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ status: "deleted" }));
    await expect(getFileMeta(CODE)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getFileMeta("bad!")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("410 when expired in DB", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ expiresAt: future(-1) }));
    await expect(getFileMeta(CODE)).rejects.toMatchObject({ code: "EXPIRED" });
    expect(cache.setMeta).not.toHaveBeenCalled();
  });
});

describe("getDownload", () => {
  it("cache hit skips DB and storage, still counts", async () => {
    vi.mocked(cache.cacheGet).mockResolvedValue({ url: "https://c/u", name: "a.txt" });
    expect(await getDownload(CODE)).toEqual({ url: "https://c/u", name: "a.txt" });
    expect(fileModel.findByCode).not.toHaveBeenCalled();
    expect(createSignedDownloadUrl).not.toHaveBeenCalled();
    expect(fileModel.incrementDownload).toHaveBeenCalledWith(CODE);
  });

  it("cache miss signs, caches with ttl 3000 and counts", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    expect(await getDownload(CODE)).toEqual({ url: "https://signed/url", name: "a.txt" });
    expect(createSignedDownloadUrl).toHaveBeenCalledWith("p/a.txt", 3600, "a.txt");
    expect(cache.cacheSet).toHaveBeenCalledWith(
      `dl:${CODE}`,
      { url: "https://signed/url", name: "a.txt" },
      3000,
    );
    expect(fileModel.incrementDownload).toHaveBeenCalledWith(CODE);
  });

  it("never caches beyond file expiry", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ expiresAt: future(100) }));
    await getDownload(CODE);
    const ttl = vi.mocked(cache.cacheSet).mock.calls[0][2] as number;
    expect(ttl).toBeLessThanOrEqual(100);
    expect(ttl).toBeGreaterThan(90);
  });

  it("ignores malformed cache value", async () => {
    vi.mocked(cache.cacheGet).mockResolvedValue("https://legacy");
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    expect((await getDownload(CODE)).url).toBe("https://signed/url");
  });

  it("tolerates counter failure on hit and miss", async () => {
    vi.mocked(fileModel.incrementDownload).mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(cache.cacheGet).mockResolvedValue({ url: "u", name: "n" });
    await expect(getDownload(CODE)).resolves.toEqual({ url: "u", name: "n" });
    vi.mocked(cache.cacheGet).mockResolvedValue(null);
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec());
    await expect(getDownload(CODE)).resolves.toMatchObject({ name: "a.txt" });
  });

  it("404/410 paths do not count or sign", async () => {
    vi.mocked(fileModel.findByCode).mockResolvedValue(null);
    await expect(getDownload(CODE)).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.mocked(fileModel.findByCode).mockResolvedValue(rec({ expiresAt: future(-1) }));
    await expect(getDownload(CODE)).rejects.toMatchObject({ code: "EXPIRED" });
    expect(createSignedDownloadUrl).not.toHaveBeenCalled();
    expect(fileModel.incrementDownload).not.toHaveBeenCalled();
  });
});
