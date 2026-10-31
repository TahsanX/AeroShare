# Spike: browser PUT to a Supabase S3 presigned URL (CORS)

Goal: confirm a browser can `PUT` a file/part directly to a presigned URL from
`storageService.presignParts` / `createSignedUploadUrl`, and that we do not need
to read the `ETag` response header (server uses ListParts).

## Steps
1. Set the `SUPABASE_S3_*` env vars (Supabase dashboard > Storage > S3 Connection).
2. In a scratch script, call `createMultipart("spike/test.bin", "application/octet-stream")`
   then `presignParts("spike/test.bin", uploadId, 1, 600)`.
3. From a page served at `http://localhost:3000`, run in the devtools console:
   ```js
   const r = await fetch(url, { method: "PUT", body: new Blob([new Uint8Array(6 * 1024 * 1024)]) });
   console.log(r.status, [...r.headers]);
   ```
4. Check the Network tab: the `OPTIONS` preflight must return 2xx with
   `Access-Control-Allow-Origin` and `Access-Control-Allow-Methods` including PUT.
5. Call `completeMultipart(...)` and verify with `objectExists`. Clean up with `deleteObject`.
6. Repeat with `createSignedUploadUrl` (single PUT, header `x-upsert`/token handling per supabase-js docs).

## Interpreting results
- 200 and no CORS error: the S3 path works; nothing else to do. The ETag header
  may be hidden from JS (not in `Access-Control-Expose-Headers`), which is fine.
- CORS error on preflight: Supabase Storage S3 may not allow browser origins.
  Fallbacks, in order:
  1. Proxy part uploads through a Next route (limited by serverless body size; poor for 50MB).
  2. **TUS resumable upload** (Supabase's native endpoint
     `https://<project>.supabase.co/storage/v1/upload/resumable`) using `tus-js-client`
     with a short-lived bearer token and 6MB chunks. TUS is browser-supported by
     Supabase and handles resume; completion is then just `objectExists`.

## Status
Verified against a live Supabase project (Free plan, 2026-11-01):

- `CreateMultipartUpload`, presigned `UploadPart` (5MB + 1MB), `ListParts`,
  `CompleteMultipartUpload` and delete all work with `forcePathStyle`.
- Browser-style `OPTIONS` preflight for `PUT` returns 200 with
  `access-control-allow-origin: *`; part `PUT`s expose the `ETag` header.
- Single signed upload and signed download URLs work; the anon key cannot list,
  download or upload objects in the private bucket.
- Full app flow (2MB single, 20MB multipart, checksum match) passes.

The TUS fallback above was not needed.
