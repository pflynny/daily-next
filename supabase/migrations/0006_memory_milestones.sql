-- Milestones + full-width display for memories (life-history timeline).
-- Run in the Supabase SQL editor.

alter table memories add column if not exists milestone boolean not null default false;
alter table memories add column if not exists full_width boolean not null default false;
