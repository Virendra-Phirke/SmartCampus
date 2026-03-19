-- Fix: Make legacy NOT NULL columns nullable so new QR generator can insert
-- Run this in your Supabase SQL Editor

ALTER TABLE attendance_sessions ALTER COLUMN faculty_id DROP NOT NULL;
ALTER TABLE attendance_sessions ALTER COLUMN course_name DROP NOT NULL;
ALTER TABLE attendance_sessions ALTER COLUMN session_date DROP NOT NULL;
ALTER TABLE attendance_sessions ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE attendance_sessions ALTER COLUMN end_time DROP NOT NULL;

-- Also ensure RLS is disabled for development
ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
