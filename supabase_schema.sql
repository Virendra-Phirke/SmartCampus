-- =============================================
-- CampusMate: Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('academic','admin','facility','sports','hostel')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT DEFAULT '',
  floors INTEGER DEFAULT 1,
  departments TEXT[] DEFAULT '{}',
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  building_id TEXT REFERENCES buildings(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('academic','cultural','sports','seminar','workshop','other')),
  image_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id TEXT REFERENCES buildings(id),
  floor INTEGER DEFAULT 1,
  room_number TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('classroom','lab','office','canteen','library','other')),
  capacity INTEGER,
  department TEXT
);

-- 4. Navigation Graph
CREATE TABLE IF NOT EXISTS navigation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id TEXT REFERENCES buildings(id),
  floor INTEGER DEFAULT 1,
  x_position DOUBLE PRECISION NOT NULL,
  y_position DOUBLE PRECISION NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('hallway','stair','elevator','ramp','entrance','room')),
  room_id UUID REFERENCES rooms(id),
  is_accessible BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS navigation_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID REFERENCES navigation_nodes(id),
  to_node_id UUID REFERENCES navigation_nodes(id),
  weight DOUBLE PRECISION NOT NULL,
  is_accessible BOOLEAN DEFAULT true
);

-- 5. Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  section TEXT,
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  qr_token TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true
);

-- 6. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  session_id UUID REFERENCES attendance_sessions(id),
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('qr','manual','ble')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 8. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','faculty','admin','visitor')),
  
  -- Extended Profile Fields
  full_name TEXT,
  mobile_no TEXT,
  address TEXT,
  
  -- Role-specific Info
  role_id TEXT, -- Roll No or Employee ID
  department_id TEXT, -- For staff and students
  course_id TEXT, -- For students
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- If table already exists, add columns safely
DO $$
BEGIN
  ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
  ALTER TABLE user_profiles ADD COLUMN mobile_no TEXT;
  ALTER TABLE user_profiles ADD COLUMN address TEXT;
  ALTER TABLE user_profiles ADD COLUMN role_id TEXT;
  ALTER TABLE user_profiles ADD COLUMN department_id TEXT;
  ALTER TABLE user_profiles ADD COLUMN course_id TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 9. Complete College Management System Tables
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  head_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  duration_years INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT REFERENCES courses(id),
  year TEXT NOT NULL,
  section_name TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES user_profiles(clerk_user_id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  role_id TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES user_profiles(clerk_user_id),
  name TEXT NOT NULL,
  roll_no TEXT UNIQUE NOT NULL,
  course_id TEXT REFERENCES courses(id),
  year TEXT NOT NULL,
  section_id UUID REFERENCES class_sections(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seating_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  seat_number TEXT NOT NULL,
  student_id UUID REFERENCES students(id),
  exam_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Row Level Security

-- =============================================

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (makes script re-runnable)
DROP POLICY IF EXISTS "Buildings are viewable by everyone" ON buildings;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can view their attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON attendance_records;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public can view departments" ON departments;
DROP POLICY IF EXISTS "Public can view courses" ON courses;
DROP POLICY IF EXISTS "Public can view class_sections" ON class_sections;
DROP POLICY IF EXISTS "Public can view staff" ON staff;
DROP POLICY IF EXISTS "Public can view students" ON students;
DROP POLICY IF EXISTS "Public can view seating" ON seating_arrangements;

-- Re-create policies
CREATE POLICY "Buildings are viewable by everyone" ON buildings FOR SELECT USING (true);
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view their attendance" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON attendance_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles are viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (true);

CREATE POLICY "Public can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Public can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Public can view class_sections" ON class_sections FOR SELECT USING (true);
CREATE POLICY "Public can view staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Public can view students" ON students FOR SELECT USING (true);
CREATE POLICY "Public can view seating" ON seating_arrangements FOR SELECT USING (true);
-- Enable Realtime for events and announcements (safe to re-run)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
