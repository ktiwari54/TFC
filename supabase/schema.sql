-- TFC Database Schema
-- Run this in Supabase Dashboard → SQL Editor

-- Films table
CREATE TABLE IF NOT EXISTS films (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  title       TEXT NOT NULL,
  date        TEXT,
  location    TEXT,
  image       TEXT,
  preview_video TEXT,
  categories  TEXT[] DEFAULT '{}',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Homepage content (each section stored by key)
CREATE TABLE IF NOT EXISTS homepage_content (
  key         TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on films
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER films_updated_at
  BEFORE UPDATE ON films
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER homepage_updated_at
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Disable Row Level Security (server uses service_role key — full access)
ALTER TABLE films DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
