-- Migration 001: Add provenance columns to images table.
--
-- Adds:
--   source    TEXT  -- 'upload' | 'pinterest' | 'generation-copy'
--   sourceUrl TEXT  -- original URL when imported from an external source
--
-- Idempotent by runner: SQLite (< 3.35) has no IF NOT EXISTS on ADD COLUMN,
-- so the runner MUST probe via `PRAGMA table_info(images)` and skip any
-- ALTER whose target column already exists.
--
-- Pseudocode for the runner:
--   cols = pragma_table_info('images').map(c => c.name)
--   if (!cols.includes('source'))    exec("ALTER TABLE images ADD COLUMN source TEXT DEFAULT 'upload'")
--   if (!cols.includes('sourceUrl')) exec("ALTER TABLE images ADD COLUMN sourceUrl TEXT")

ALTER TABLE images ADD COLUMN source TEXT DEFAULT 'upload';
ALTER TABLE images ADD COLUMN sourceUrl TEXT;
