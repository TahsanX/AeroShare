# Server core API

Import types/constants from `@/shared/contracts`. All modules are server-only.
Env is read lazily via `getEnv()`; nothing throws at import time.

## `@/lib/errors`
- `class AppError(code: ErrorCode, message?)` with `.code`, `.status`.
- `toErrorResponse(err): NextResponse<ApiError>` - AppError -> its status; anything else -> 500 INTERNAL_ERROR (logged).
- `errorBody(code, message): ApiError`.

## `@/lib/base62`
- `encode(bigint): string`, `decode(string): bigint`, `generateCode(): string` (8 chars, crypto-random).

## `@/lib/env`
- `getEnv(): ServerEnv` (zod-validated, cached; throws ZodError if required vars missing). Redis vars optional.

## `@/server/services/storageService`
- `createSignedUploadUrl(path): Promise<{url, token, path}>`
- `createSignedDownloadUrl(path, ttlSec, downloadName?): Promise<string>`
- `objectExists(path): Promise<boolean>`
- `deleteObject(path): Promise<void>`
- `createMultipart(path, mime): Promise<uploadId>`
- `presignParts(path, uploadId, partCount, ttlSec): Promise<{partNumber, url}[]>` (partNumber from 1)
- `completeMultipart(path, uploadId): Promise<void>` (ETags via ListParts; VALIDATION_ERROR if no parts)
- `abortMultipart(path, uploadId): Promise<void>`
- `listStaleMultipart(olderThanMs = 24h): Promise<{path, uploadId, initiated?}[]>`

## `@/server/services/cacheService` (best-effort; never throws)
- `getDownloadUrl(code)` / `setDownloadUrl(code, url, ttlSec)` - key `dl:{code}`
- `getMeta(code): FileMeta | null` / `setMeta(code, meta, ttlSec = 60)` - key `meta:{code}`
- `invalidate(code)` - deletes both keys
- generic: `cacheGet<T>(key)`, `cacheSet(key, value, ttlSec)`, `cacheDel(...keys)`; `getRedis(): Redis | null`

## `@/server/services/rateLimitService`
- Policies (per IP, sliding window / 1 min): `init` 10, `complete` 30, `abort` 30, `download` 60, `metadata` 120.
- `getClientIp(request): string`
- `checkRateLimit(policy, ip): Promise<{success, retryAfterSec}>`
- `withRateLimit(policy, handler)` -> wrapped handler `(request, ...args)`; over limit returns 429 `RATE_LIMITED` with `Retry-After`.
- Fails open (console warning) when Redis is not configured or errors.

## `@/server/models/fileModel`
Types: `FileStatus`, `FileRow` (DB shape), `FileRecord` (camelCase, includes `id`, `storagePath`, `uploadId`, `status`, `downloadCount`).
- `create({name,size,mime,storagePath,expiresAt,uploadId?}): FileRecord` - inserts `pending` row, generates `short_code`, retries on unique violation (max 3).
- `findByCode(code): FileRecord | null`
- `markReady(id)`, `setUploadId(id, uploadId)`, `markDeleted(id)`, `deleteById(id)`
- `listExpired(limit=100, now?)`, `listStalePending(olderThanMs=1h, limit=100, now?)`
- `incrementDownload(code)` - rpc `increment_download_count` with arg `{ p_code: text }` (matches the SQL function in `supabase/migrations`).
- `rowToRecord(row)`, `recordToMeta(record): FileMeta`

Table: `files(id, short_code unique, original_name, size_bytes, mime_type, storage_path, upload_id, status, download_count, created_at, expires_at)`.

## `@/server/services/supabaseClient`
- `getSupabase()` service-role client, `getBucketName()`.
