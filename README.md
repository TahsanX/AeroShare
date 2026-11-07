# AeroShare

Simple file sharing with short links. Drop a file, get a link, share it. No account needed.

## Screenshots

| | |
| --- | --- |
| ![Hero and upload](docs/screenshots/01-hero-upload.png) | ![Animated stats](docs/screenshots/02-stats.png) |
| ![Features](docs/screenshots/03-features.png) | ![How it works](docs/screenshots/04-how-it-works.png) |
| ![FAQ](docs/screenshots/05-faq.png) | |

## Features

- No login or sign-up.
- Drag-and-drop upload.
- 50 MB file limit (see [Limits & notes](#limits--notes)).
- Presigned upload: the browser sends the file straight to storage, not through the app server.
- Multipart upload for files larger than 5 MB (8 MB parts, 3 in parallel, retry with backoff).
- Download URLs are signed and cached in Redis.
- Base62 short links (8 characters), for example `/s/Ab3dE9xZ`.
- Per-IP rate limiting.
- Files expire after 1 day or 7 days, and a cleanup job removes them.
- Dark and light theme.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), Sonner, next-themes |
| Storage | Supabase Storage (private bucket, S3-compatible API) |
| Database | Supabase Postgres |
| Cache and rate limit | Upstash Redis |
| Validation | zod |
| Tests | Vitest |
| Hosting and CI/CD | Vercel, GitHub Actions |

## How it works

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Next.js API
    participant S as Supabase Storage
    participant D as Postgres
    participant R as Redis

    Note over B,S: Upload
    B->>A: POST /api/uploads/init
    A->>D: insert row (pending)
    A->>S: create presigned URL(s)
    A-->>B: code + upload URL(s)
    B->>S: PUT file (or parts) directly
    B->>A: POST /api/uploads/complete
    A->>S: verify / complete multipart
    A->>D: mark ready
    A-->>B: share path /s/code

    Note over B,R: Download
    B->>A: GET /api/files/code/download
    A->>R: cached signed URL?
    alt miss
        A->>D: load file row
        A->>S: sign download URL
        A->>R: cache URL
    end
    A-->>B: signed URL
    B->>S: GET file
```

More detail: [docs/architecture.md](docs/architecture.md).

## Quick start

Prerequisites: Node.js 24, npm, a Supabase project and an Upstash Redis database (see [docs/setup.md](docs/setup.md)).

```bash
npm install
cp .env.example .env     # then fill in the values
# apply the SQL files in supabase/migrations (see supabase/README.md)
npm run dev
```

Open http://localhost:3000.

Redis is optional for local work: without it, caching is skipped and rate limiting is off (fails open).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright end-to-end tests (needs `.env` with real Supabase and Upstash credentials) |
| `npm run bench` | Benchmarks against the live backend (see [Performance](#performance)) |
| `npm run format` | Prettier |

## Performance

Measured with [`scripts/bench.mjs`](scripts/bench.mjs) (`npm run bench`) against the real Supabase Storage/Postgres and Upstash Redis backend, local dev server, single run. Numbers will vary with network conditions and plan tier; re-run before quoting them anywhere that matters.

| What | Result |
| --- | --- |
| Short-link collision risk | 8-char base62 = 218 trillion codes; <0.23% chance of a collision even at 1M links live at once (auto-retries on collision) |
| Redis-cached downloads | Repeat signed-download requests served from cache ran 2.8-3.5x faster than the first (uncached) request, which has to sign a fresh URL with Supabase Storage |
| Per-IP rate limiting | Verified: the 11th upload-init request within a minute from one IP is rejected with 429, matching the configured 10 req/min policy |
| Concurrent upload-init load | 300 requests from 50 simulated concurrent clients: ~4 req/s sustained, 90% success, p95 latency ~3s. The errors trace to Supabase's free-tier connection limits under burst, not application code - a real scaling bottleneck a paid plan or connection pooling would remove |
| Parallel multipart upload | Uploading a 24 MB file as 3 parts in parallel (as shipped) vs. one at a time: 1.3-1.7x faster, bounded by the 3-way parallelism cap |

## Project structure

The app follows an MVC-style layout inside Next.js.

```
src/
  app/                    Views (pages) and route handlers
    page.tsx              Home: upload
    s/[code]/             Share page: download
    api/
      uploads/{init,complete,abort}/route.ts
      files/[code]/route.ts            metadata
      files/[code]/download/route.ts   signed download URL
      cron/cleanup/route.ts            expiry cleanup
  components/             Views: upload, download, layout, theme, ui (shadcn)
  server/
    controllers/          Request logic: upload, download, cleanup
    models/               fileModel: the only code that touches the files table
    services/             Storage (S3 + signed URLs), cache, rate limit, Supabase client
  shared/contracts/       zod schemas, constants and error codes used by client and server
  lib/                    base62, env, errors, client uploader/downloader
supabase/migrations/      SQL: files table, RLS, private bucket
docs/                     Documentation
.github/workflows/        CI, preview, deploy, cleanup cron
```

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Setup guide](docs/setup.md)
- [CI/CD](docs/ci-cd.md)
- [Database notes](supabase/README.md)

## Limits & notes

- The limit is 50 MB because that is the global Storage cap on the Supabase Free plan.
- To allow larger files (for example 512 MB) you need a paid Supabase plan. Raise the global limit under Project Settings -> Storage -> "Upload file size limit", then update all three places:
  1. `MAX_FILE_SIZE` in `src/shared/contracts/constants.ts`
  2. the `size_bytes` check in `supabase/migrations/20261031000000_init_files.sql`
  3. the bucket `file_size_limit` in `supabase/migrations/20261031000100_storage_bucket.sql`
- Anyone who has a link can download the file until it expires. There is no password or account.
