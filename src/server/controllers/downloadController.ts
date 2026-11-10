import { AppError } from "@/lib/errors";
import * as fileModel from "@/server/models/fileModel";
import type { FileRecord } from "@/server/models/fileModel";
import * as cache from "@/server/services/cacheService";
import { createSignedDownloadUrl } from "@/server/services/storageService";
import {
  SHORT_CODE_LENGTH,
  type DownloadResponse,
  type FileMeta,
} from "@/shared/contracts";

export const META_CACHE_MAX_TTL_SEC = 60;
export const SIGNED_URL_TTL_SEC = 3600;
export const DOWNLOAD_CACHE_TTL_SEC = 3000;

const CODE_RE = new RegExp(`^[0-9A-Za-z]{${SHORT_CODE_LENGTH}}$`);

const dlKey = (code: string) => `dl:${code}`;

function assertCode(code: string): void {
  if (!CODE_RE.test(code)) throw new AppError("NOT_FOUND", "File not found");
}

function secondsUntil(iso: string, now = Date.now()): number {
  return Math.floor((new Date(iso).getTime() - now) / 1000);
}

function isExpired(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() <= now;
}

/** Loads a ready, unexpired record or throws NOT_FOUND / EXPIRED. */
async function loadAvailable(code: string): Promise<FileRecord> {
  const rec = await fileModel.findByCode(code);
  if (!rec || rec.status !== "ready") throw new AppError("NOT_FOUND", "File not found");
  if (isExpired(rec.expiresAt)) throw new AppError("EXPIRED", "This file has expired");
  return rec;
}

export async function getFileMeta(code: string): Promise<FileMeta> {
  assertCode(code);
  const cached = await cache.getMeta(code);
  if (cached) {
    if (isExpired(cached.expiresAt)) throw new AppError("EXPIRED", "This file has expired");
    return cached;
  }
  const rec = await loadAvailable(code);
  const meta = fileModel.recordToMeta(rec);
  const ttl = Math.min(META_CACHE_MAX_TTL_SEC, secondsUntil(rec.expiresAt));
  if (ttl >= 1) await cache.setMeta(code, meta, ttl);
  return meta;
}

function parseCachedDownload(value: unknown): DownloadResponse | null {
  if (value && typeof value === "object") {
    const { url, name } = value as Partial<DownloadResponse>;
    if (typeof url === "string" && typeof name === "string") return { url, name };
  }
  return null;
}

async function bumpCounter(code: string): Promise<void> {
  try {
    await fileModel.incrementDownload(code);
  } catch (e) {
    console.warn("download counter failed", e);
  }
}

export async function getDownload(code: string): Promise<DownloadResponse> {
  assertCode(code);
  const hit = parseCachedDownload(await cache.cacheGet<unknown>(dlKey(code)));
  if (hit) {
    await bumpCounter(code);
    return hit;
  }

  const rec = await loadAvailable(code);
  const url = await createSignedDownloadUrl(rec.storagePath, SIGNED_URL_TTL_SEC, rec.name);
  const result: DownloadResponse = { url, name: rec.name };
  const ttl = Math.min(DOWNLOAD_CACHE_TTL_SEC, secondsUntil(rec.expiresAt));
  if (ttl >= 1) await cache.cacheSet(dlKey(code), result, ttl);
  await bumpCounter(code);
  return result;
}
