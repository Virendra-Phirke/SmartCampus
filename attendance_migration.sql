-- =============================================
-- CampusMate: Academic Profile & QR Attendance Migration
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Add academic fields to user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles ADD COLUMN branch TEXT;
  ALTER TABLE user_profiles ADD COLUMN roll_number TEXT;
  ALTER TABLE user_profiles ADD COLUMN section TEXT;
  ALTER TABLE user_profiles ADD COLUMN academic_year TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 2. Expand attendance_records to store rich QR scanned data
DO $$
BEGIN
  ALTER TABLE attendance_records ADD COLUMN scanned_user_name TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_email TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_mobile TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_college TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_branch TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_roll TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_section TEXT;
  ALTER TABLE attendance_records ADD COLUMN scanned_user_year TEXT;
  
  -- The existing user_id column will now represent the Scanner (Teacher/Admin)
  -- The scanned_user_* columns represent the Student who presented the QR.
  -- Add a new column to optionally link the scanned user's ID
  ALTER TABLE attendance_records ADD COLUMN scanned_user_id TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. In case we need to make building_id optional (since a QR scan might happen anywhere)
ALTER TABLE attendance_records ALTER COLUMN building_id DROP NOT NULL;
