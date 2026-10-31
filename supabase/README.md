# AeroShare database

Migrations live in `supabase/migrations/`:

- `20261031000000_init_files.sql` - `public.files` table, indexes, RLS, `increment_download_count()`.
- `20261031000100_storage_bucket.sql` - private `uploads` bucket (50 MB limit).

## Apply

With the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file, in order, into the Supabase dashboard SQL editor.

The migrations are idempotent and safe to re-run.

## Access model

RLS is enabled on `files` with no policies, so `anon`/`authenticated` can read
or write nothing. All access goes through the server using the service-role key.
This keeps short codes unlistable, since the anon key is public.
`increment_download_count` is executable by `service_role` only.

## File size limits (important)

The app limit is 50 MB (52428800 bytes), matching the Supabase Free plan's
global Storage cap. The same value is used in `MAX_FILE_SIZE`
(`src/shared/contracts/constants.ts`), the `files.size_bytes` check and the
bucket `file_size_limit`.

To support larger files later (e.g. 512 MB) you need the Pro plan, raise the
global limit under Project Settings -> Storage -> "Upload file size limit", and
update all three places above.
