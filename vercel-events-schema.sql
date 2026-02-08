-- NYC Events – schema for Vercel + Neon (or any Postgres)
-- Run this in Neon SQL Editor (Neon dashboard → SQL Editor) or your Postgres client.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  address text,
  neighborhood text,
  venue text,
  image_url text,
  price text,
  link text not null,
  platform text not null,
  description text,
  created_at timestamptz default now(),
  unique(link)
);

-- If you already have the table, add columns as needed:
-- alter table events add column if not exists address text;
-- alter table events add column if not exists venue text;
-- alter table events add column if not exists image_url text;
create index if not exists events_date_idx on events (date);
create index if not exists events_platform_idx on events (platform);
create index if not exists events_neighborhood_idx on events (neighborhood);
create index if not exists events_venue_idx on events (venue);
