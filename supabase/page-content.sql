-- Add page_content table for per-page editable content
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS page_content (
  page        TEXT NOT NULL,
  selector    TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text',
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (page, selector)
);

CREATE TRIGGER page_content_updated_at
  BEFORE UPDATE ON page_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE page_content DISABLE ROW LEVEL SECURITY;
