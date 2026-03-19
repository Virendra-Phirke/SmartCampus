-- Fix RLS policy for attendance_sessions to allow authenticated users to insert
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS (simplest, use for development)
ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, use these policies instead:
-- (Uncomment lines below and comment out the DISABLE line above)

-- DROP POLICY IF EXISTS "Allow authenticated insert" ON attendance_sessions;
-- CREATE POLICY "Allow authenticated insert" ON attendance_sessions
--   FOR INSERT TO authenticated, anon
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Allow authenticated select" ON attendance_sessions;
-- CREATE POLICY "Allow authenticated select" ON attendance_sessions
--   FOR SELECT TO authenticated, anon
--   USING (true);

-- DROP POLICY IF EXISTS "Allow authenticated update" ON attendance_sessions;
-- CREATE POLICY "Allow authenticated update" ON attendance_sessions
--   FOR UPDATE TO authenticated, anon
--   USING (true);
