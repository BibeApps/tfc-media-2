-- Add is_reopened field to support_tickets table
-- This tracks when a client has reopened a resolved ticket

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS is_reopened BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on reopened tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_is_reopened 
ON support_tickets(is_reopened);

-- Add comment explaining the field
COMMENT ON COLUMN support_tickets.is_reopened IS 'Tracks if client has reopened a resolved ticket. Cleared when admin responds.';
