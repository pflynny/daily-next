-- Daily — initial schema
-- Run in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Every table is owner-scoped via Row Level Security.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  text text not null default '',
  completed boolean not null default false,
  is_label boolean not null default false,
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_user_date on tasks (user_id, date, position);

-- ------------------------------------------------------------------
-- routines (recurring tasks)
-- ------------------------------------------------------------------
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null default '',
  days smallint[] not null default '{}',
  active boolean not null default true,
  position integer not null default 0,
  last_generated date,
  created_at timestamptz not null default now()
);
create index if not exists idx_routines_user on routines (user_id, position);

-- ------------------------------------------------------------------
-- lists (brain dump): groups -> lists -> items
-- ------------------------------------------------------------------
create table if not exists list_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_list_groups_user on list_groups (user_id, position);

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references list_groups (id) on delete cascade,
  name text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_lists_group on lists (group_id, position);

create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid not null references lists (id) on delete cascade,
  text text not null default '',
  completed boolean not null default false,
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_list_items_list on list_items (list_id, position);

-- ------------------------------------------------------------------
-- collections (Year): collection per (year, name) -> items
-- ------------------------------------------------------------------
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  name text not null default '',
  position integer not null default 0,
  banner_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_collections_user_year on collections (user_id, year, position);

create table if not exists collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references collections (id) on delete cascade,
  title text not null default '',
  creator text not null default '',
  rating integer check (rating is null or (rating >= 1 and rating <= 10)),
  review text not null default '',
  media_type text not null default 'other',
  cover_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_collection_items_collection on collection_items (collection_id, position);

-- ------------------------------------------------------------------
-- goals + dated entries
-- ------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  cadence text not null default 'day' check (cadence in ('day', 'week', 'month')),
  target integer not null default 1 check (target >= 1),
  color text,
  position integer not null default 0,
  archived boolean not null default false,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_goals_user on goals (user_id, position);

create table if not exists goal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references goals (id) on delete cascade,
  date date not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (goal_id, date)
);
create index if not exists idx_goal_entries_goal_date on goal_entries (goal_id, date);

-- ------------------------------------------------------------------
-- memories + media
-- ------------------------------------------------------------------
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  type text not null default 'note' check (type in ('note', 'quote', 'photo', 'video', 'link')),
  title text not null default '',
  body text not null default '',
  quote_author text not null default '',
  link_url text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_memories_user_date on memories (user_id, occurred_on desc);

create table if not exists memory_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  memory_id uuid not null references memories (id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'video')),
  url text not null,
  key text not null,
  width integer,
  height integer,
  mime text not null default '',
  size bigint not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_memory_media_memory on memory_media (memory_id, position);

-- ------------------------------------------------------------------
-- liked quotes
-- ------------------------------------------------------------------
create table if not exists liked_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  author text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, text, author)
);
create index if not exists idx_liked_quotes_user on liked_quotes (user_id, created_at desc);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
alter table profiles         enable row level security;
alter table tasks            enable row level security;
alter table routines         enable row level security;
alter table list_groups      enable row level security;
alter table lists            enable row level security;
alter table list_items       enable row level security;
alter table collections      enable row level security;
alter table collection_items enable row level security;
alter table goals            enable row level security;
alter table goal_entries     enable row level security;
alter table memories         enable row level security;
alter table memory_media     enable row level security;
alter table liked_quotes     enable row level security;

-- profiles are keyed by the auth id directly
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- every other table: owner-scoped on user_id
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks','routines','list_groups','lists','list_items','collections','collection_items',
    'goals','goal_entries','memories','memory_media','liked_quotes'
  ]
  loop
    execute format('drop policy if exists "owner all" on %I', t);
    execute format(
      'create policy "owner all" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
