-- Add is_read column to support_tickets table
-- This separates read/unread state from ticket status

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Update existing tickets to be unread by default
UPDATE support_tickets 
SET is_read = FALSE 
WHERE is_read IS NULL;

-- Add index for faster queries on unread tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_is_read 
ON support_tickets(is_read);

-- Add comment explaining the field
COMMENT ON COLUMN support_tickets.is_read IS 'Tracks whether an admin has viewed this ticket. Independent of status field.';
