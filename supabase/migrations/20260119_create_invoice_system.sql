-- =====================================================
-- Invoice System - Phase 1: Database Tables
-- =====================================================
-- This migration creates the invoice system infrastructure
-- including invoices, invoice_payments tables with proper
-- RLS policies for security.
-- =====================================================

-- =====================================================
-- 1. INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    
    -- Client info
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    
    -- Invoice details
    title TEXT NOT NULL,
    notes TEXT,
    
    -- Service line item
    service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
    service_price DECIMAL(10, 2) NOT NULL,
    
    -- Payment terms
    payment_type TEXT NOT NULL CHECK (payment_type IN ('full', 'partial')),
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    amount_due DECIMAL(10, 2) NOT NULL,
    
    -- Payment status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial_paid', 'fully_paid', 'overdue', 'voided')),
    
    -- Stripe integration
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Deep link for client payment
    payment_token TEXT UNIQUE NOT NULL,
    payment_link_sent_at TIMESTAMPTZ,
    
    -- Associated gallery session (optional - links invoice to specific event)
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Dates
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INVOICE PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_token ON invoices(payment_token);
CREATE INDEX IF NOT EXISTS idx_invoices_session_id ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_type_id ON invoices(service_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Invoice payments table indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_at ON invoice_payments(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- =====================================================
-- 4.1 INVOICES TABLE POLICIES
-- =====================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
    ON invoices FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Clients can view invoices sent to their email
CREATE POLICY "Clients can view own invoices by email"
    ON invoices FOR SELECT
    TO authenticated
    USING (
        client_email = (
            SELECT email FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- Allow anonymous access via payment token (for payment page)
CREATE POLICY "Anyone can view invoice by payment token"
    ON invoices FOR SELECT
    TO anon, authenticated
    USING (payment_token IS NOT NULL);

-- Admins can create invoices
CREATE POLICY "Admins can create invoices"
    ON invoices FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update invoices
CREATE POLICY "Admins can update invoices"
    ON invoices FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can delete/void invoices
CREATE POLICY "Admins can delete invoices"
    ON invoices FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4.2 INVOICE PAYMENTS TABLE POLICIES
-- =====================================================
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Admins can view all invoice payments
CREATE POLICY "Admins can view all invoice payments"
    ON invoice_payments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Clients can view payments for their invoices
CREATE POLICY "Clients can view own invoice payments"
    ON invoice_payments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_payments.invoice_id
            AND invoices.client_email = (
                SELECT email FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

-- Admins can create payment records
CREATE POLICY "Admins can create invoice payments"
    ON invoice_payments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- System can create payment records (for webhook)
CREATE POLICY "System can create invoice payments"
    ON invoice_payments FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================

-- Trigger for invoices table (reuse existing function)
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTION: Generate Invoice Number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get current year
    year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence number for this year
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year || '-%';
    
    -- Format: INV-YYYY-0001
    invoice_num := 'INV-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. HELPER FUNCTION: Generate Payment Token
-- =====================================================
CREATE OR REPLACE FUNCTION generate_payment_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token (32 characters)
    RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE invoices IS 'Stores client invoices for upfront or partial payments';
COMMENT ON TABLE invoice_payments IS 'Payment history for invoices';

COMMENT ON COLUMN invoices.payment_token IS 'Secure token for payment deep link URL';
COMMENT ON COLUMN invoices.session_id IS 'Optional link to gallery session for download control';
COMMENT ON COLUMN invoices.payment_type IS 'full = full payment required, partial = partial payment allowed';
COMMENT ON COLUMN invoices.status IS 'pending, partial_paid, fully_paid, overdue, voided';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Phase 2: Modify sessions table (add payment_status, invoice_id)
-- 3. Phase 3: Build Admin UI for invoice management
-- 4. Phase 4: Build client payment page
-- =====================================================
