-- Notes: freeform markdown notes.
-- Run in the Supabase SQL editor.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_user_updated on notes (user_id, updated_at desc);

alter table notes enable row level security;

create policy "owner all" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
