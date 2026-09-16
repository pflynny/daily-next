-- Display-size thumbnail for each photo (cards/timeline); the original
-- stays for the lightbox and film export.
alter table memory_media
  add column if not exists thumb_key text;
