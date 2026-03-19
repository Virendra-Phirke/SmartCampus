-- Add scan/profile/location fields for QR attendance metadata indexing
-- Run this in Supabase SQL editor

ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS course_or_department TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS roll_no TEXT,
ADD COLUMN IF NOT EXISTS mobile_no TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS scan_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS campus_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS campus_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS distance_from_campus_km DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_attendance_records_session_checked_in
ON attendance_records (session_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_distance_from_campus
ON attendance_records (distance_from_campus_km);
