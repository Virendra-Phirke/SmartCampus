-- =============================================
-- CampusMate: Add created_by to announcements & update RLS
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Add created_by column to announcements if it doesn't exist
DO $$
BEGIN
  ALTER TABLE announcements ADD COLUMN created_by TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Policies for Events table
-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop generic insert/update/delete policies if any
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Create open policies for client-side enforcement
CREATE POLICY "Authenticated users can create events"
ON events FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own events"
ON events FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own events"
ON events FOR DELETE USING (true);

-- Policies for Announcements table
-- Ensure RLS is enabled
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create announcements" ON announcements;
DROP POLICY IF EXISTS "Users can update their own announcements" ON announcements;
DROP POLICY IF EXISTS "Users can delete their own announcements" ON announcements;

-- Create open policies for client-side enforcement
CREATE POLICY "Authenticated users can create announcements"
ON announcements FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own announcements"
ON announcements FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own announcements"
ON announcements FOR DELETE USING (true);
