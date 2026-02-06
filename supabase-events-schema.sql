-- NYC Events – Supabase schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) after creating a project.

-- Table: events (NYC events from Dice and other platforms)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  neighborhood text,
  price text,
  link text not null,
  platform text not null,
  description text,
  created_at timestamptz default now(),
  unique(link)
);

-- Index for filtering
create index if not exists events_date_idx on public.events (date);
create index if not exists events_platform_idx on public.events (platform);
create index if not exists events_neighborhood_idx on public.events (neighborhood);

-- RLS: allow read and insert for anon (frontend + scraper with anon key)
-- For public read + insert only; restrict delete/update in policy if needed.
alter table public.events enable row level security;

create policy "Allow public read"
  on public.events for select
  using (true);

create policy "Allow public insert"
  on public.events for insert
  with check (true);

create policy "Allow public update"
  on public.events for update
  using (true);

create policy "Allow public delete"
  on public.events for delete
  using (true);

-- Optional: grant usage for anon role
grant select, insert, update, delete on public.events to anon;
grant usage on schema public to anon;
