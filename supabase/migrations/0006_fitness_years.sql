-- Fitness years: one row per calendar year of imported fitness data —
-- a Garmin summary (from Personal Record's daily-fitness.json export)
-- and/or peak-bagging counts (from a cairnbook backup). Feeds Wrapped.
-- Run in the Supabase SQL editor.

create table if not exists fitness_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  garmin jsonb,
  peaks jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);
create index if not exists idx_fitness_years_user_year on fitness_years (user_id, year);

alter table fitness_years enable row level security;

create policy "owner all" on fitness_years
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
