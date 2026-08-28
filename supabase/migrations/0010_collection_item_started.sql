-- Optional start date for collection entries (started reading, project
-- kick-off…). Pairs with happened_on as the finish date.
alter table collection_items
  add column if not exists started_on date;
