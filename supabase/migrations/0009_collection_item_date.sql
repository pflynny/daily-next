-- Optional "when it happened" date for collection entries
-- (achievements, finish dates for books, etc.)
alter table collection_items
  add column if not exists happened_on date;
