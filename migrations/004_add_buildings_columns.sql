-- Add college_id column to buildings table if it doesn't exist
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS college_id TEXT;

-- Update the heading in admin panel
COMMENT ON COLUMN buildings.created_by IS 'Clerk user ID of the creator';
COMMENT ON COLUMN buildings.college_id IS 'College this building belongs to';
