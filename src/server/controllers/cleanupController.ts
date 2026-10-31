import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import * as fileModel from "@/server/models/fileModel";
import * as cache from "@/server/services/cacheService";
import * as storage from "@/server/services/storageService";

export const CLEANUP_BATCH_SIZE = 100;

export type CleanupResult = {
  expired: number;
  stalePending: number;
  staleMultipart: number;
  errors: number;
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Keep timing roughly constant, then reject.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Throws UNAUTHORIZED unless `Authorization: Bearer <CRON_SECRET>` matches. */
export function assertCronAuth(authorization: string | null): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError("UNAUTHORIZED", "Unauthorized");
  const prefix = "Bearer ";
  const token = authorization?.startsWith(prefix) ? authorization.slice(prefix.length) : "";
  if (!safeEqual(token, secret)) throw new AppError("UNAUTHORIZED", "Unauthorized");
}

export async function runCleanup(authorization: string | null): Promise<CleanupResult> {
  assertCronAuth(authorization);
  const result: CleanupResult = { expired: 0, stalePending: 0, staleMultipart: 0, errors: 0 };

  const guard = async (fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      return true;
    } catch (e) {
      result.errors++;
      console.warn("cleanup item failed", e);
      return false;
    }
  };

  // (a) expired files
  let expired: fileModel.FileRecord[] = [];
  await guard(async () => {
    expired = await fileModel.listExpired(CLEANUP_BATCH_SIZE);
  });
  for (const rec of expired) {
    const ok = await guard(async () => {
      if (rec.uploadId) await storage.abortMultipart(rec.storagePath, rec.uploadId).catch(() => {});
      await storage.deleteObject(rec.storagePath);
      await fileModel.markDeleted(rec.id);
      await cache.invalidate(rec.code);
    });
    if (ok) result.expired++;
  }

  // (b) abandoned pending uploads
  let pending: fileModel.FileRecord[] = [];
  await guard(async () => {
    pending = await fileModel.listStalePending(undefined, CLEANUP_BATCH_SIZE);
  });
  for (const rec of pending) {
    const ok = await guard(async () => {
      if (rec.uploadId) await storage.abortMultipart(rec.storagePath, rec.uploadId);
      await storage.deleteObject(rec.storagePath);
      await fileModel.markDeleted(rec.id);
    });
    if (ok) result.stalePending++;
  }

  // (c) orphaned multipart uploads in storage
  let stale: storage.StaleMultipart[] = [];
  await guard(async () => {
    stale = (await storage.listStaleMultipart()).slice(0, CLEANUP_BATCH_SIZE);
  });
  for (const m of stale) {
    const ok = await guard(() => storage.abortMultipart(m.path, m.uploadId));
    if (ok) result.staleMultipart++;
  }

  return result;
}
