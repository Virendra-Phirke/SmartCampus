-- Add description field and ensure audience scope columns are optional
-- Run this in Supabase SQL editor

ALTER TABLE attendance_sessions
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure scope filters can be omitted during QR generation
ALTER TABLE attendance_sessions
ALTER COLUMN college_id DROP NOT NULL,
ALTER COLUMN target_audience DROP NOT NULL,
ALTER COLUMN department DROP NOT NULL,
ALTER COLUMN year DROP NOT NULL,
ALTER COLUMN section DROP NOT NULL,
ALTER COLUMN staff_type DROP NOT NULL;
