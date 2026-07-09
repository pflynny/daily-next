-- Web Push subscriptions for check-in reminders.
-- Run in the Supabase SQL editor.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "owner all" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
