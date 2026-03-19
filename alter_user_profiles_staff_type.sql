-- Add missing column used by the profile form
-- Run in Supabase SQL editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS staff_type TEXT;
