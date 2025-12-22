-- Fix RLS policies for portal_projects table
-- This allows admins to create and manage projects

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON portal_projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON portal_projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON portal_projects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON portal_projects;

-- Enable RLS on the table
ALTER TABLE portal_projects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to insert projects
CREATE POLICY "Enable insert for authenticated users" ON portal_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to read all projects
CREATE POLICY "Enable read access for authenticated users" ON portal_projects
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update projects
CREATE POLICY "Enable update for authenticated users" ON portal_projects
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete projects
CREATE POLICY "Enable delete for authenticated users" ON portal_projects
    FOR DELETE
    TO authenticated
    USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'portal_projects';
