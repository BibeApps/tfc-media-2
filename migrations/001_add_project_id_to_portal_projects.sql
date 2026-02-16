-- Phase 1: Add Project ID system to portal_projects table
-- This migration adds project_id (auto-generated) and transaction_id (optional) columns

-- Step 1: Add new columns to portal_projects
ALTER TABLE portal_projects 
ADD COLUMN project_id VARCHAR(20) UNIQUE,
ADD COLUMN transaction_id VARCHAR(100);

-- Step 2: Create function to generate project IDs
-- Format: PROJ-YYYYMMDD-XXXX (e.g., PROJ-20251228-0001)
CREATE OR REPLACE FUNCTION generate_project_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  date_part TEXT;
  counter INT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the next counter for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_id FROM 15) AS INT)), 0) + 1
  INTO counter
  FROM portal_projects
  WHERE project_id LIKE 'PROJ-' || date_part || '-%';
  
  new_id := 'PROJ-' || date_part || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-generate project_id for new projects
CREATE OR REPLACE FUNCTION set_project_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    NEW.project_id := generate_project_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_id
BEFORE INSERT ON portal_projects
FOR EACH ROW
EXECUTE FUNCTION set_project_id();

-- Step 4: Backfill existing projects with project IDs
UPDATE portal_projects 
SET project_id = generate_project_id()
WHERE project_id IS NULL;

-- Step 5: Make project_id NOT NULL after backfill
ALTER TABLE portal_projects 
ALTER COLUMN project_id SET NOT NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'portal_projects'
AND column_name IN ('project_id', 'transaction_id')
ORDER BY ordinal_position;
