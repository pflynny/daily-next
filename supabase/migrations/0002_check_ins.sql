-- Check-ins: morning (feelings) + evening (feelings + three good things)
-- Run in the Supabase SQL editor.

create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('morning', 'evening')),
  feelings text[] not null default '{}',
  -- up to three entries; the first is the day's top thing
  gratitude text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date, kind)
);
create index if not exists idx_check_ins_user_date on check_ins (user_id, date desc);

alter table check_ins enable row level security;

create policy "owner all" on check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
