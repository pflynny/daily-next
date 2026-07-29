-- Pick of the year: one starred item per collection.
alter table collection_items
  add column if not exists pick boolean not null default false;
