-- Disable Row Level Security (RLS) outright for Events and Announcements
-- Run this in your Supabase SQL Editor to fully open the tables to the client.

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- Ensure the anon role has permission to actually perform inserts/updates
GRANT ALL ON events TO anon, authenticated;
GRANT ALL ON announcements TO anon, authenticated;
