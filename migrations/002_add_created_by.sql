-- Migration: Add created_by tracking columns
-- Run this in Supabase SQL Editor

-- Add created_by to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by to buildings table (for creator permissions)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS created_by TEXT;
