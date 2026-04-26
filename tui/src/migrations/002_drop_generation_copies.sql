-- Migration 002: Gallery represents user-uploaded references only.
--
-- Earlier code mirrored every generation into `images` with source =
-- 'generation-copy' so the gallery picker could see them. The new
-- workflow gates that promotion behind the explicit `u` hotkey, so the
-- old mirror rows are obsolete and must be cleared.
--
-- The runner executes this file unconditionally — the DELETE is a
-- no-op on a clean schema (no rows match) and idempotent thereafter.

DELETE FROM images WHERE source = 'generation-copy';
