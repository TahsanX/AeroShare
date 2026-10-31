# AeroShare database

Migrations live in `supabase/migrations/`:

- `20261031000000_init_files.sql` - `public.files` table, indexes, RLS, `increment_download_count()`.
- `20261031000100_storage_bucket.sql` - private `uploads` bucket (512 MB limit).

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

The bucket sets a 512 MB (536870912 bytes) limit, but Supabase also enforces a
**global** Storage file size limit that caps every bucket:

- Free plan: 50 MB maximum.
- Pro plan (or higher): configurable up to much larger values.

To allow 512 MB uploads you need the Pro plan, and you must raise the global
limit in the dashboard: Project Settings -> Storage -> "Upload file size limit"
(set to at least 512 MB). The migration cannot change this setting.
