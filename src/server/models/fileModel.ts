import { generateCode } from "@/lib/base62";
import { AppError } from "@/lib/errors";
import { getSupabase } from "@/server/services/supabaseClient";
import type { FileMeta } from "@/shared/contracts";

const TABLE = "files";
export const MAX_CODE_ATTEMPTS = 3;

export type FileStatus = "pending" | "ready" | "deleted";

export type FileRow = {
  id: string;
  short_code: string;
  original_name: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
  upload_id: string | null;
  status: FileStatus;
  download_count: number;
  created_at: string;
  expires_at: string;
};

export type FileRecord = {
  id: string;
  code: string;
  name: string;
  size: number;
  mime: string;
  storagePath: string;
  uploadId: string | null;
  status: FileStatus;
  downloadCount: number;
  createdAt: string;
  expiresAt: string;
};

export type CreateFileInput = {
  name: string;
  size: number;
  mime: string;
  storagePath: string;
  expiresAt: Date;
  uploadId?: string | null;
};

export function rowToRecord(row: FileRow): FileRecord {
  return {
    id: row.id,
    code: row.short_code,
    name: row.original_name,
    size: Number(row.size_bytes),
    mime: row.mime_type,
    storagePath: row.storage_path,
    uploadId: row.upload_id,
    status: row.status,
    downloadCount: row.download_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function recordToMeta(rec: FileRecord): FileMeta {
  return {
    code: rec.code,
    name: rec.name,
    size: rec.size,
    mime: rec.mime,
    expiresAt: rec.expiresAt,
  };
}

function fail(op: string, message: string): never {
  throw new AppError("INTERNAL_ERROR", `fileModel.${op}: ${message}`);
}

const UNIQUE_VIOLATION = "23505";

/**
 * Inserts a pending row with a fresh short code, retrying on code collisions
 * (max MAX_CODE_ATTEMPTS). `makeCode` is injectable for tests.
 */
export async function create(
  input: CreateFileInput,
  makeCode: () => string = generateCode,
): Promise<FileRecord> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .insert({
        short_code: makeCode(),
        original_name: input.name,
        size_bytes: input.size,
        mime_type: input.mime,
        storage_path: input.storagePath,
        upload_id: input.uploadId ?? null,
        status: "pending",
        expires_at: input.expiresAt.toISOString(),
      })
      .select()
      .single();
    if (!error && data) return rowToRecord(data as FileRow);
    if (error?.code !== UNIQUE_VIOLATION) fail("create", error?.message ?? "no data");
  }
  return fail("create", "short code collision, retries exhausted");
}

export async function findByCode(code: string): Promise<FileRecord | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq("short_code", code)
    .maybeSingle();
  if (error) fail("findByCode", error.message);
  return data ? rowToRecord(data as FileRow) : null;
}

async function update(
  op: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabase().from(TABLE).update(patch).eq("id", id);
  if (error) fail(op, error.message);
}

export const markReady = (id: string) =>
  update("markReady", id, { status: "ready", upload_id: null });

export const setUploadId = (id: string, uploadId: string) =>
  update("setUploadId", id, { upload_id: uploadId });

export const markDeleted = (id: string) =>
  update("markDeleted", id, { status: "deleted", upload_id: null });

export async function deleteById(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
  if (error) fail("deleteById", error.message);
}

/** Non-deleted rows whose expiry has passed. */
export async function listExpired(limit = 100, now = new Date()): Promise<FileRecord[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .lt("expires_at", now.toISOString())
    .neq("status", "deleted")
    .order("expires_at", { ascending: true })
    .limit(limit);
  if (error) fail("listExpired", error.message);
  return ((data ?? []) as FileRow[]).map(rowToRecord);
}

/** Pending rows created more than `olderThanMs` ago (abandoned uploads). */
export async function listStalePending(
  olderThanMs = 60 * 60 * 1000,
  limit = 100,
  now = new Date(),
): Promise<FileRecord[]> {
  const cutoff = new Date(now.getTime() - olderThanMs).toISOString();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select()
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) fail("listStalePending", error.message);
  return ((data ?? []) as FileRow[]).map(rowToRecord);
}

/** Atomic counter bump via SQL function `increment_download_count(p_code text)`. */
export async function incrementDownload(code: string): Promise<void> {
  const { error } = await getSupabase().rpc("increment_download_count", { p_code: code });
  if (error) fail("incrementDownload", error.message);
}
