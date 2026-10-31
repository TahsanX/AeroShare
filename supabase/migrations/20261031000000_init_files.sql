-- AeroShare: files table, RLS, and download counter function.

create table if not exists public.files (
  id             uuid primary key default gen_random_uuid(),
  short_code     text unique not null,
  original_name  text not null,
  size_bytes     bigint not null check (size_bytes > 0 and size_bytes <= 536870912),
  mime_type      text,
  storage_path   text not null,
  upload_id      text, -- multipart upload id, if any
  status         text not null default 'pending' check (status in ('pending', 'ready', 'deleted')),
  download_count int not null default 0,
  created_at     timestamptz default now(),
  expires_at     timestamptz not null
);

-- short_code already has a unique index via the constraint.
create index if not exists files_expires_at_idx on public.files (expires_at);
create index if not exists files_status_created_at_idx on public.files (status, created_at);

alter table public.files enable row level security;

-- No insert/update/delete policies: writes happen only via the server
-- using the service-role key (which bypasses RLS).
drop policy if exists "anon can read ready, unexpired files" on public.files;
create policy "anon can read ready, unexpired files"
  on public.files
  for select
  to anon
  using (status = 'ready' and expires_at > now());

-- Atomically increments download_count for a ready, non-expired file.
create or replace function public.increment_download_count(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.files
     set download_count = download_count + 1
   where short_code = p_code
     and status = 'ready'
     and expires_at > now();
$$;

revoke all on function public.increment_download_count(text) from public;
revoke all on function public.increment_download_count(text) from anon, authenticated;
grant execute on function public.increment_download_count(text) to service_role;
