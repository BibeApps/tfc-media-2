-- Phase 1: Link sessions to projects for client-specific gallery access
-- This migration adds project_id and email columns to sessions table

-- Step 1: Add project linking columns to sessions
ALTER TABLE sessions
ADD COLUMN project_id VARCHAR(20) REFERENCES portal_projects(project_id) ON DELETE SET NULL,
ADD COLUMN email VARCHAR(255);

-- Step 2: Create indexes for faster client queries
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_email ON sessions(email);

-- Step 3: Create composite index for project + client queries
CREATE INDEX idx_sessions_project_email ON sessions(project_id, email);

-- Step 4: Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Clients can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON sessions;
DROP POLICY IF EXISTS "Public can view sessions" ON sessions;

-- Step 6: Create RLS policies

-- Admin can see everything
CREATE POLICY "Admins can view all sessions"
ON sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Clients can only see their own sessions (matched by email)
CREATE POLICY "Clients can view their own sessions"
ON sessions FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email FROM profiles
    WHERE id = auth.uid()
  )
);

-- Admin can insert/update/delete
CREATE POLICY "Admins can manage all sessions"
ON sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
AND column_name IN ('project_id', 'email')
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'sessions';
