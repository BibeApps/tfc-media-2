-- =====================================================
-- Invoice System - Phase 2: Table Modifications
-- =====================================================
-- This migration modifies existing tables to support
-- the invoice system integration with gallery sessions
-- and enhances service_types with category support.
-- =====================================================

-- =====================================================
-- 1. ALTER SESSIONS TABLE
-- =====================================================
-- Add payment status and invoice reference to sessions
-- This allows gallery sessions to be linked to invoices
-- and control download permissions based on payment status

-- Check if columns already exist before adding
DO $$ 
BEGIN
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE sessions 
        ADD COLUMN payment_status TEXT DEFAULT 'not_paid' 
        CHECK (payment_status IN ('not_paid', 'invoice_partially_paid', 'invoice_fully_paid'));
        
        COMMENT ON COLUMN sessions.payment_status IS 'Payment status: not_paid (default cart flow), invoice_partially_paid (downloads blocked), invoice_fully_paid (free downloads)';
    END IF;

    -- Add invoice_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE sessions 
        ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN sessions.invoice_id IS 'Optional link to invoice for payment tracking and download control';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE INDEXES FOR SESSIONS
-- =====================================================
-- Indexes for performance on new columns

CREATE INDEX IF NOT EXISTS idx_sessions_payment_status 
ON sessions(payment_status);

CREATE INDEX IF NOT EXISTS idx_sessions_invoice_id 
ON sessions(invoice_id);

-- Composite index for common queries (sessions by payment status and invoice)
CREATE INDEX IF NOT EXISTS idx_sessions_payment_invoice 
ON sessions(payment_status, invoice_id) 
WHERE invoice_id IS NOT NULL;

-- =====================================================
-- 3. ALTER SERVICE_TYPES TABLE (OPTIONAL)
-- =====================================================
-- Add category field to service_types for better organization
-- This is optional but recommended for the invoice system

DO $$ 
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_types' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE service_types 
        ADD COLUMN category TEXT DEFAULT 'general';
        
        COMMENT ON COLUMN service_types.category IS 'Service category: photography, videography, design, editing, etc.';
    END IF;
END $$;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_service_types_category 
ON service_types(category) 
WHERE is_active = true;

-- Update existing service types with appropriate categories (optional)
-- Uncomment and modify based on your existing data
/*
UPDATE service_types 
SET category = CASE 
    WHEN name ILIKE '%photo%' THEN 'photography'
    WHEN name ILIKE '%video%' THEN 'videography'
    WHEN name ILIKE '%edit%' THEN 'editing'
    WHEN name ILIKE '%drone%' THEN 'aerial'
    WHEN name ILIKE '%design%' THEN 'design'
    ELSE 'general'
END
WHERE category = 'general';
*/

-- =====================================================
-- 4. PRESERVE EXISTING RLS POLICIES
-- =====================================================
-- DO NOT modify existing RLS policies - they work well!
-- We only ensure RLS is enabled on the sessions table.
-- The new columns (payment_status, invoice_id) will work
-- with existing policies automatically.

-- Ensure sessions table has RLS enabled (safe if already enabled)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Note: Existing RLS policies on sessions table are preserved.
-- The new payment_status and invoice_id columns will be accessible
-- according to the existing policy rules.


-- =====================================================
-- 5. HELPER FUNCTION: Update Session Payment Status
-- =====================================================
-- This function automatically updates session payment status
-- when an invoice status changes

CREATE OR REPLACE FUNCTION update_session_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If invoice is linked to a session, update the session's payment status
    IF NEW.session_id IS NOT NULL THEN
        UPDATE sessions
        SET payment_status = CASE
            WHEN NEW.status = 'fully_paid' THEN 'invoice_fully_paid'
            WHEN NEW.status IN ('partial_paid', 'pending') THEN 'invoice_partially_paid'
            ELSE 'not_paid'
        END,
        invoice_id = NEW.id
        WHERE id = NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update session payment status
DROP TRIGGER IF EXISTS trigger_update_session_payment_status ON invoices;
CREATE TRIGGER trigger_update_session_payment_status
    AFTER INSERT OR UPDATE OF status, session_id
    ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_session_payment_status();

-- =====================================================
-- 6. HELPER FUNCTION: Reset Session Payment Status
-- =====================================================
-- This function resets session payment status when invoice is deleted/voided

CREATE OR REPLACE FUNCTION reset_session_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If invoice was linked to a session, reset the session's payment status
    IF OLD.session_id IS NOT NULL THEN
        UPDATE sessions
        SET payment_status = 'not_paid',
            invoice_id = NULL
        WHERE id = OLD.session_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset session payment status on invoice deletion
DROP TRIGGER IF EXISTS trigger_reset_session_payment_status ON invoices;
CREATE TRIGGER trigger_reset_session_payment_status
    BEFORE DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION reset_session_payment_status();

-- =====================================================
-- 7. DATA MIGRATION
-- =====================================================
-- Set default payment_status for all existing sessions
-- This ensures backward compatibility

UPDATE sessions 
SET payment_status = 'not_paid' 
WHERE payment_status IS NULL;

-- =====================================================
-- 8. VALIDATION QUERIES
-- =====================================================
-- Run these to verify the migration succeeded

-- Verify columns added
DO $$
DECLARE
    payment_status_exists BOOLEAN;
    invoice_id_exists BOOLEAN;
    category_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'payment_status'
    ) INTO payment_status_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'invoice_id'
    ) INTO invoice_id_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_types' AND column_name = 'category'
    ) INTO category_exists;
    
    RAISE NOTICE 'Sessions.payment_status exists: %', payment_status_exists;
    RAISE NOTICE 'Sessions.invoice_id exists: %', invoice_id_exists;
    RAISE NOTICE 'Service_types.category exists: %', category_exists;
    
    IF payment_status_exists AND invoice_id_exists THEN
        RAISE NOTICE '✓ Phase 2 migration completed successfully!';
    ELSE
        RAISE WARNING '⚠ Some columns may not have been created. Check errors above.';
    END IF;
END $$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN sessions.payment_status IS 'Controls download permissions: not_paid (cart flow), invoice_partially_paid (blocked), invoice_fully_paid (free)';
COMMENT ON COLUMN sessions.invoice_id IS 'Links session to invoice for payment tracking';
COMMENT ON COLUMN service_types.category IS 'Service category for filtering and organization';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Verify all columns created successfully
-- 2. Test triggers with sample invoice
-- 3. Update TypeScript Session interface to include new fields
-- 4. Phase 3: Build Admin UI for invoice management
-- =====================================================
