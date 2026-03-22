-- Add created_by column to events table if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add created_by column to announcements table if it doesn't exist
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Verify the columns exist
SELECT 'events created_by:' as table_name, column_name FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'created_by'
UNION ALL
SELECT 'announcements created_by:' as table_name, column_name FROM information_schema.columns 
WHERE table_name = 'announcements' AND column_name = 'created_by';
