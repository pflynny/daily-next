-- Goals belong to a calendar year: set fresh each January, carry over the
-- keepers. Backfills existing goals from their start date.
-- Run in the Supabase SQL editor.

alter table goals add column if not exists year integer;
update goals set year = extract(year from started_at)::int where year is null;
alter table goals alter column year set not null;
alter table goals alter column year set default extract(year from now())::int;

create index if not exists idx_goals_user_year on goals (user_id, year, position);
