-- Ensure tags column exists in portfolio_projects table
-- Tags are stored as a JSON array of strings

-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'portfolio_projects' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE portfolio_projects 
        ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN portfolio_projects.tags IS 'Array of tag strings for categorizing portfolio items';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'portfolio_projects'
AND column_name = 'tags';
