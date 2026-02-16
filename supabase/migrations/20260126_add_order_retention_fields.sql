-- =====================================================
-- Migration: Add Order Retention Fields
-- =====================================================
-- Adds order_type, retention_expires_at, and archived
-- fields to the existing orders table for tracking
-- instant downloads, bulk downloads, and media retention.
-- =====================================================

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'cart_purchase' 
  CHECK (order_type IN ('cart_purchase', 'instant_download', 'bulk_download')),
ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Set retention for existing orders (6 months from creation)
UPDATE orders 
SET retention_expires_at = created_at + INTERVAL '6 months'
WHERE retention_expires_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_retention_expires_at ON orders(retention_expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);

-- Add comments for documentation
COMMENT ON COLUMN orders.order_type IS 'How the order was created: cart_purchase (normal checkout), instant_download (single $0 item), or bulk_download (multiple $0 items with zip)';
COMMENT ON COLUMN orders.retention_expires_at IS 'Date when media will be archived/deleted (6 months from creation). Users receive email reminders at 90, 30, 15, and 7 days before expiry.';
COMMENT ON COLUMN orders.archived IS 'Whether media has been archived to cold storage after retention period expired';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
