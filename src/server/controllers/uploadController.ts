import { AppError } from "@/lib/errors";
import * as fileModel from "@/server/models/fileModel";
import * as cache from "@/server/services/cacheService";
import * as storage from "@/server/services/storageService";
import {
  EXPIRY_OPTIONS,
  MAX_FILE_SIZE,
  MULTIPART_THRESHOLD,
  PART_SIZE,
  abortUploadRequestSchema,
  completeUploadRequestSchema,
  initUploadRequestSchema,
  type CompleteUploadResponse,
  type InitUploadResponse,
} from "@/shared/contracts";

const PART_URL_TTL_SEC = 60 * 60;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON");
  }
}

/** Best-effort: never throws. */
async function quietly(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (err) {
    console.warn("upload cleanup failed", err);
  }
}

export async function initUpload(request: Request): Promise<InitUploadResponse> {
  const body = await readJson(request);
  // Report oversize files with their own error code before schema validation.
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { size?: unknown }).size === "number" &&
    (body as { size: number }).size > MAX_FILE_SIZE
  ) {
    throw new AppError("FILE_TOO_LARGE", "File exceeds the maximum allowed size");
  }
  const parsed = initUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid upload request");
  }
  const { name, size, mime, expiresIn } = parsed.data;

  const storagePath = `u/${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + EXPIRY_OPTIONS[expiresIn] * 1000);

  if (size <= MULTIPART_THRESHOLD) {
    const record = await fileModel.create({ name, size, mime, storagePath, expiresAt });
    try {
      const { url } = await storage.createSignedUploadUrl(storagePath);
      return { mode: "single", code: record.code, uploadUrl: url };
    } catch (err) {
      await quietly(() => fileModel.markDeleted(record.id));
      throw err;
    }
  }

  const uploadId = await storage.createMultipart(storagePath, mime);
  let record: fileModel.FileRecord;
  try {
    record = await fileModel.create({ name, size, mime, storagePath, expiresAt, uploadId });
  } catch (err) {
    await quietly(() => storage.abortMultipart(storagePath, uploadId));
    throw err;
  }
  try {
    const partCount = Math.ceil(size / PART_SIZE);
    const parts = await storage.presignParts(storagePath, uploadId, partCount, PART_URL_TTL_SEC);
    return { mode: "multipart", code: record.code, uploadId, partSize: PART_SIZE, parts };
  } catch (err) {
    await quietly(() => storage.abortMultipart(storagePath, uploadId));
    await quietly(() => fileModel.markDeleted(record.id));
    throw err;
  }
}

async function loadByBody(body: unknown, schema: typeof completeUploadRequestSchema) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Invalid request");
  const record = await fileModel.findByCode(parsed.data.code);
  if (!record || record.status === "deleted") {
    throw new AppError("NOT_FOUND", "Upload not found");
  }
  return record;
}

export async function completeUpload(request: Request): Promise<CompleteUploadResponse> {
  const record = await loadByBody(await readJson(request), completeUploadRequestSchema);
  const response: CompleteUploadResponse = {
    code: record.code,
    sharePath: `/s/${record.code}`,
    expiresAt: record.expiresAt,
  };
  if (record.status === "ready") return response; // idempotent

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new AppError("EXPIRED", "Upload has expired");
  }

  if (record.uploadId) {
    await storage.completeMultipart(record.storagePath, record.uploadId);
  } else if (!(await storage.objectExists(record.storagePath))) {
    throw new AppError("VALIDATION_ERROR", "Upload has not finished");
  }
  await fileModel.markReady(record.id);
  await cache.invalidate(record.code);
  return response;
}

export async function abortUpload(request: Request): Promise<{ ok: true }> {
  const record = await loadByBody(await readJson(request), abortUploadRequestSchema);
  if (record.status !== "pending") {
    // Ready files must never be deletable by code alone.
    throw new AppError("NOT_FOUND", "Upload not found");
  }
  if (record.uploadId) {
    const uploadId = record.uploadId;
    await quietly(() => storage.abortMultipart(record.storagePath, uploadId));
  }
  await quietly(() => storage.deleteObject(record.storagePath));
  await fileModel.markDeleted(record.id);
  await cache.invalidate(record.code);
  return { ok: true };
}
