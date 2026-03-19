-- Add missing profile columns used by app forms
-- Run this in Supabase SQL editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS staff_type TEXT;
