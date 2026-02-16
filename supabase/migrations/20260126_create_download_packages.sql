-- =====================================================
-- Migration: Create Download Packages Table
-- =====================================================
-- Creates table for tracking bulk download zip files
-- with expiration and status tracking.
-- =====================================================

-- Create download_packages table
CREATE TABLE IF NOT EXISTS download_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    zip_file_url TEXT, -- Supabase Storage URL
    zip_file_size BIGINT, -- Size in bytes
    item_count INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('generating', 'ready', 'expired', 'failed')),
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL, -- created_at + 48 hours
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_download_packages_order_id ON download_packages(order_id);
CREATE INDEX IF NOT EXISTS idx_download_packages_status ON download_packages(status);
CREATE INDEX IF NOT EXISTS idx_download_packages_expires_at ON download_packages(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE download_packages ENABLE ROW LEVEL SECURITY;

-- Users can view their own download packages
CREATE POLICY "Users can view own download packages"
    ON download_packages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = download_packages.order_id
            AND orders.client_id = auth.uid()
        )
    );

-- Admins can view all download packages
CREATE POLICY "Admins can view all download packages"
    ON download_packages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Service role can manage download packages (for Edge Functions)
CREATE POLICY "Service role can manage download packages"
    ON download_packages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

-- Trigger for download_packages table (uses existing function)
DROP TRIGGER IF EXISTS update_download_packages_updated_at ON download_packages;
CREATE TRIGGER update_download_packages_updated_at
    BEFORE UPDATE ON download_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE download_packages IS 'Tracks bulk download zip files with expiration and status';
COMMENT ON COLUMN download_packages.zip_file_url IS 'Supabase Storage URL for the generated zip file';
COMMENT ON COLUMN download_packages.zip_file_size IS 'Size of zip file in bytes';
COMMENT ON COLUMN download_packages.item_count IS 'Number of items included in the zip';
COMMENT ON COLUMN download_packages.status IS 'generating (in progress), ready (available), expired (link expired), failed (error occurred)';
COMMENT ON COLUMN download_packages.expires_at IS 'When the download link expires (48 hours from creation)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
