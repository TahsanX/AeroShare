-- AeroShare: private storage bucket for uploads.

insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- NOTE: Intentionally NO policies on storage.objects for anon/authenticated.
-- Downloads happen only via server-created signed URLs, and uploads via
-- signed upload URL tokens (both created server-side with the service-role
-- key), so no client-side policy is required.

-- Fallback (only if signed-URL uploads are not usable, e.g. resumable TUS
-- uploads straight from the browser): allow anon INSERT into this bucket only.
-- Uncomment to enable.
--
-- create policy "anon can upload to uploads bucket"
--   on storage.objects
--   for insert
--   to anon
--   with check (bucket_id = 'uploads');
