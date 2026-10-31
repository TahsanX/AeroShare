# API reference

All endpoints are under `/api`, accept and return JSON, and need no authentication (except the cron endpoint). Schemas live in `src/shared/contracts`.

Typical upload order: `init` -> upload bytes to storage -> `complete`. Typical download order: `GET /api/files/{code}` -> `GET /api/files/{code}/download`.

## Errors

All errors use the same shape:

```json
{ "error": { "code": "NOT_FOUND", "message": "File not found" } }
```

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Invalid JSON or body, or the upload has not finished |
| `UNAUTHORIZED` | 401 | Missing or wrong cron secret |
| `NOT_FOUND` | 404 | Unknown code, file not ready, or not abortable |
| `EXPIRED` | 410 | The file or upload has expired |
| `FILE_TOO_LARGE` | 413 | `size` is more than 50 MB (52428800 bytes) |
| `RATE_LIMITED` | 429 | Too many requests; see the `Retry-After` header (seconds) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Rate limits

Per IP, sliding window of 1 minute. Over the limit the API returns `429` with `RATE_LIMITED` and a `Retry-After` header. If Redis is not configured, limits are not enforced.

| Policy | Limit per minute |
| --- | --- |
| `init` | 10 |
| `complete` | 30 |
| `abort` | 30 |
| `download` | 60 |
| `metadata` | 120 |

## POST /api/uploads/init

Rate limit: `init`. Creates a pending file record and returns upload URL(s).

Request:

```json
{
  "name": "report.pdf",
  "size": 2097152,
  "mime": "application/pdf",
  "expiresIn": "7d"
}
```

- `name`: string, 1 to 255 characters.
- `size`: integer in bytes, more than 0 and at most 52428800.
- `mime`: optional, default `application/octet-stream`.
- `expiresIn`: optional, `"1d"` or `"7d"` (default `"7d"`).

Response when `size` is 5 MB or less (`mode: "single"`). The client does one `PUT` of the whole file to `uploadUrl`:

```json
{
  "mode": "single",
  "code": "Ab3dE9xZ",
  "uploadUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/uploads/u/..."
}
```

Response when `size` is more than 5 MB (`mode: "multipart"`). The client uploads each part with `PUT`; part `n` covers bytes `(n-1) * partSize` up to `n * partSize` (the last part is shorter):

```json
{
  "mode": "multipart",
  "code": "Ab3dE9xZ",
  "uploadId": "2~example-upload-id",
  "partSize": 8388608,
  "parts": [
    { "partNumber": 1, "url": "https://example.com/part-1" },
    { "partNumber": 2, "url": "https://example.com/part-2" }
  ]
}
```

Part URLs are valid for 1 hour. Errors: `400 VALIDATION_ERROR`, `413 FILE_TOO_LARGE`, `429`, `500`.

## POST /api/uploads/complete

Rate limit: `complete`. Verifies the upload and marks the file ready. Safe to call again for a file that is already ready.

Request:

```json
{ "code": "Ab3dE9xZ" }
```

Response:

```json
{
  "code": "Ab3dE9xZ",
  "sharePath": "/s/Ab3dE9xZ",
  "expiresAt": "2026-11-08T12:00:00.000Z"
}
```

Errors: `400 VALIDATION_ERROR` (bad body, or the bytes are not in storage yet), `404 NOT_FOUND`, `410 EXPIRED`, `429`, `500`.

## POST /api/uploads/abort

Rate limit: `abort`. Cancels a pending upload and deletes its data. Only works while the file is `pending`.

Request:

```json
{ "code": "Ab3dE9xZ" }
```

Response:

```json
{ "ok": true }
```

Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND` (unknown code, or the file is no longer pending), `429`, `500`.

## GET /api/files/{code}

Rate limit: `metadata`. Returns public metadata for a ready, unexpired file. `code` is 8 characters from `0-9A-Za-z`; any other value returns `404`.

Response:

```json
{
  "code": "Ab3dE9xZ",
  "name": "report.pdf",
  "size": 2097152,
  "mime": "application/pdf",
  "expiresAt": "2026-11-08T12:00:00.000Z"
}
```

Errors: `404 NOT_FOUND`, `410 EXPIRED`, `429`, `500`.

## GET /api/files/{code}/download

Rate limit: `download`. Returns a signed download URL (valid for 1 hour) and increments the download counter. The response has `Cache-Control: no-store`.

Response:

```json
{
  "url": "https://<project>.supabase.co/storage/v1/object/sign/uploads/u/...?token=...",
  "name": "report.pdf"
}
```

Errors: `404 NOT_FOUND`, `410 EXPIRED`, `429`, `500`.

## POST /api/cron/cleanup

No rate limit. Called hourly by GitHub Actions (see [ci-cd.md](ci-cd.md)). Removes expired files, abandoned pending uploads and stale multipart uploads.

Header: `Authorization: Bearer <CRON_SECRET>`.

Response:

```json
{ "expired": 3, "stalePending": 1, "staleMultipart": 0, "errors": 0 }
```

Errors: `401 UNAUTHORIZED`, `500`.

Example:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.example.com/api/cron/cleanup
```
