-- Run this in your Supabase Dashboard -> SQL Editor
-- This allows anyone who is signed in to add and modify campus locations

-- Enable authenticated users to insert new buildings
CREATE POLICY "Users can insert buildings" 
ON buildings FOR INSERT TO authenticated 
WITH CHECK (true);

-- Enable authenticated users to update existing buildings
CREATE POLICY "Users can update buildings" 
ON buildings FOR UPDATE TO authenticated 
USING (true);
