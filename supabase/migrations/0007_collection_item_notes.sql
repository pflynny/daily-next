-- Notes & quotes on collection entries (book passages with page refs, etc.)
-- Run in the Supabase SQL editor.

alter table collection_items add column if not exists notes text not null default '';
