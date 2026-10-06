-- Software updates pushed from the dashboard (run once in the Supabase SQL editor).
-- Vercel's filesystem is read-only, so updates_db.json never persisted there.
create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  release_notes text not null,
  download_url text not null,
  is_critical boolean not null default false,
  sha256 text,
  published_at timestamptz not null default now()
);

create index if not exists app_updates_published_at_idx on public.app_updates (published_at desc);

-- Only the server (service-role key) reads and writes this table; the anon key gets nothing.
alter table public.app_updates enable row level security;
