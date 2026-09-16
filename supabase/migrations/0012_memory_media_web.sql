-- Streaming-friendly rendition (720p H.264, faststart) for videos.
-- The original stays; thumb_key holds the poster frame for videos.
alter table memory_media
  add column if not exists web_key text;
