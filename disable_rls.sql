-- Use this script to temporarily drop all Row Level Security restrictions
-- This will allow anyone to insert, update, or read from these tables.
-- Run this in your Supabase SQL Editor AFTER running supabase_schema.sql

-- Disable RLS on core tables
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON buildings;
DROP POLICY IF EXISTS "Users can insert buildings" ON buildings;
DROP POLICY IF EXISTS "Users can update buildings" ON buildings;
DROP POLICY IF EXISTS "Buildings are viewable by everyone" ON buildings;

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;

ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON announcements;
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;

ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view their attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON attendance_records;

-- Disable RLS on the newly added PRD tables
ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_edges DISABLE ROW LEVEL SECURITY;

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Disable RLS on the new College Management tables
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_arrangements DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view departments" ON departments;
DROP POLICY IF EXISTS "Public can view courses" ON courses;
DROP POLICY IF EXISTS "Public can view class_sections" ON class_sections;
DROP POLICY IF EXISTS "Public can view staff" ON staff;
DROP POLICY IF EXISTS "Public can view students" ON students;
DROP POLICY IF EXISTS "Public can view seating" ON seating_arrangements;

-- If you ever want to reset it securely later, you would run:
-- ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY ...
