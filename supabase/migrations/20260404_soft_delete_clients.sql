-- ============================================================
-- Migration: Soft-Delete / Archive for Clients
-- Date: 2026-04-04
-- Purpose: Replace hard-delete with soft-delete to preserve
--          financial records (orders, invoices, payments) for
--          bookkeeping, tax, and audit compliance.
-- ============================================================

-- 1. Add archived_at column to profiles (NULL = active, timestamp = archived)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add archived_by column (which admin archived this client)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Index for fast filtering of active vs archived clients
CREATE INDEX IF NOT EXISTS idx_profiles_archived_at ON profiles(archived_at);

-- 4. Fix support_tickets FK constraints
--    Currently NO ACTION (default) which BLOCKS deletion entirely.
--    Change to SET NULL so tickets are preserved but unblocked.
--    Even with soft-delete, this is a safety net for edge cases.

-- Drop and recreate user_id FK
ALTER TABLE support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;

ALTER TABLE support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Drop and recreate responded_by FK
ALTER TABLE support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_responded_by_fkey;

ALTER TABLE support_tickets
ADD CONSTRAINT support_tickets_responded_by_fkey
  FOREIGN KEY (responded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Documentation
COMMENT ON COLUMN profiles.archived_at IS 'Timestamp when client was archived/soft-deleted. NULL means active.';
COMMENT ON COLUMN profiles.archived_by IS 'UUID of admin who archived this client.';
