-- =============================================
-- CampusMate: College System Migration
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Create colleges table
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  zoom INTEGER DEFAULT 16,
  address TEXT DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add college_id to user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles ADD COLUMN college_id UUID REFERENCES colleges(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add college_id to buildings
DO $$
BEGIN
  ALTER TABLE buildings ADD COLUMN college_id UUID REFERENCES colleges(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 4. Add username and image_url to user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles ADD COLUMN username TEXT;
  ALTER TABLE user_profiles ADD COLUMN image_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 5. Enable RLS on colleges
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- 6. Policies for colleges
DROP POLICY IF EXISTS "Colleges are viewable by everyone" ON colleges;
CREATE POLICY "Colleges are viewable by everyone" ON colleges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert colleges" ON colleges;
CREATE POLICY "Authenticated users can insert colleges" ON colleges FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update colleges" ON colleges;
CREATE POLICY "Authenticated users can update colleges" ON colleges FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete colleges" ON colleges;
CREATE POLICY "Authenticated users can delete colleges" ON colleges FOR DELETE USING (true);

-- 7. Enable Realtime for colleges
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE colleges;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
