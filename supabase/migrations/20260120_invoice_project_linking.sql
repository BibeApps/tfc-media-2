-- =====================================================
-- Invoice System - Phase 3: Project & Client Linking
-- =====================================================
-- This migration adds foreign key columns to link invoices
-- with clients (users) and projects for auto-onboarding
-- =====================================================

-- Add client_id column to invoices table
-- Links invoice to the user/client who will pay it
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add project_id column to invoices table
-- Links invoice to the auto-created project in client portal
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES portal_projects(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);

-- Add comments for documentation
COMMENT ON COLUMN invoices.client_id IS 'Foreign key to profiles table - the client/user who owns this invoice';
COMMENT ON COLUMN invoices.project_id IS 'Foreign key to portal_projects table - auto-created project when invoice is paid';

-- =====================================================
-- Backfill existing invoices with client_id
-- =====================================================
-- This attempts to link existing invoices to clients by email
-- Only updates invoices where client_id is NULL

UPDATE invoices i
SET client_id = p.id
FROM profiles p
WHERE i.client_email = p.email
  AND i.client_id IS NULL
  AND p.role = 'client';

-- =====================================================
-- Update RLS Policies for invoices table
-- =====================================================
-- Allow clients to view their own invoices

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "Clients can view their own invoices" ON invoices;

-- Create new policy for client access
CREATE POLICY "Clients can view their own invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
    auth.uid() = client_id
    OR 
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =====================================================
-- Helper Function: Link Invoice to Client by Email
-- =====================================================
-- This function can be called to link an invoice to a client
-- after the client user is created

CREATE OR REPLACE FUNCTION link_invoice_to_client(
    p_invoice_id UUID,
    p_client_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Find client by email
    SELECT id INTO v_client_id
    FROM profiles
    WHERE email = p_client_email
    AND role = 'client'
    LIMIT 1;

    -- If client found, link to invoice
    IF v_client_id IS NOT NULL THEN
        UPDATE invoices
        SET client_id = v_client_id
        WHERE id = p_invoice_id;
        
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- =====================================================
-- Helper Function: Link Invoice to Project
-- =====================================================
-- This function links an invoice to a project after creation

CREATE OR REPLACE FUNCTION link_invoice_to_project(
    p_invoice_id UUID,
    p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE invoices
    SET project_id = p_project_id
    WHERE id = p_invoice_id;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify the migration worked correctly

-- Check that columns were added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'client_id'
    ) THEN
        RAISE EXCEPTION 'Column client_id was not added to invoices table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'project_id'
    ) THEN
        RAISE EXCEPTION 'Column project_id was not added to invoices table';
    END IF;

    RAISE NOTICE 'Migration successful: All columns added correctly';
END $$;
