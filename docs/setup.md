# Setup guide

This guide covers the external services AeroShare needs. For a quick local start, see the [README](../README.md).

## 1. Supabase

1. Create a project at https://supabase.com.
2. Apply the migrations in `supabase/migrations/`, in order.
   - With the CLI: `supabase link --project-ref <ref>` then `supabase db push`.
   - Or paste each file into the dashboard SQL editor.
   - They create the `files` table (with RLS, no policies), the `increment_download_count()` function and a private `uploads` bucket. They are safe to re-run. See [supabase/README.md](../supabase/README.md).
3. Check the bucket: Storage should show a private bucket named `uploads` (50 MB limit). If you use a different name, set `SUPABASE_BUCKET`.
4. Create S3 access keys: Project Settings -> Storage -> S3 Connection. Note the endpoint, region, and create an access key pair. These are used for multipart uploads.
5. Copy the project URL, anon key and service role key from Project Settings -> API.
6. Plan limit: the Free plan has a global 50 MB upload cap, which matches the app. To use bigger files, upgrade, raise the global limit in Project Settings -> Storage, and update the three places listed in the README ("Limits & notes").

## 2. Upstash Redis

1. Create a Redis database at https://upstash.com.
2. Copy the REST URL and REST token into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Redis is optional. Without it the app still works, but there is no caching and no rate limiting.

## 3. Local environment

```bash
cp .env.example .env
```

Fill in the values (table below). Set `CRON_SECRET` to a long random string, for example `openssl rand -hex 32`.

## 4. Vercel and GitHub

1. Import the repository as a Vercel project and add all environment variables from the table to it (Production, and Preview if you use previews).
2. Add the GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `APP_URL`, `CRON_SECRET`). `CRON_SECRET` must be the same value as in Vercel.
3. Turn off Vercel's own Git auto-deploy, because GitHub Actions deploys.

Details and branch protection advice: [ci-cd.md](ci-cd.md).

## Environment variables

Validated in `src/lib/env.ts`. Empty values count as unset.

| Name | Purpose | Used in | Public or secret |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (default `http://localhost:3000`) | Server and client | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (required) | Server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (optional; the server does not rely on it) | Server | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for database and storage (required) | Server only | Secret |
| `SUPABASE_BUCKET` | Bucket name (default `uploads`) | Server | Not secret |
| `SUPABASE_S3_ENDPOINT` | Supabase S3-compatible endpoint (required) | Server only | Not secret |
| `SUPABASE_S3_REGION` | S3 region of the project (required) | Server only | Not secret |
| `SUPABASE_S3_ACCESS_KEY_ID` | S3 access key id (required) | Server only | Secret |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | S3 secret key (required) | Server only | Secret |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL (optional) | Server only | Secret |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token (optional) | Server only | Secret |
| `CRON_SECRET` | Bearer token for `/api/cron/cleanup` | Server only | Secret |

Only variables starting with `NEXT_PUBLIC_` can reach the browser. Never put a secret in one of those.

## Troubleshooting

- **`npm run typecheck` fails with missing route or page types.** The script runs `next typegen` first, which generates the types used by `PageProps`. Run it through npm, not `tsc` alone.
- **Storage rejects an upload even though the file is within the app limit.** The Supabase global upload limit (Project Settings -> Storage) must be at least the app limit.
- **Env validation error on the first API call.** Required variables are checked when first used, not at startup. Check the table above for missing values.
- **Browser upload is blocked by CORS.** Uploads go from the browser straight to the Supabase signed URL. The notes in `src/server/services/SPIKE_S3_CORS.md` describe how to test this (check the `OPTIONS` preflight for `PUT`) and list fallbacks such as TUS resumable upload. With the Supabase project used in development this worked (preflight 200, `access-control-allow-origin: *`), so a failure usually means a different region/endpoint value or a proxy in between.
- **The ETag header is not readable in the browser.** This is fine: the server completes multipart uploads by listing the parts.
- **429 responses during testing.** Rate limits are per IP and per minute (see [api.md](api.md)). Wait for `Retry-After`, or run without Redis locally.
- **Files are not removed after expiry.** Check that the `Cleanup cron` workflow runs and that `APP_URL` and `CRON_SECRET` match the deployed app. Expired files are blocked from download either way (`410 EXPIRED`).
