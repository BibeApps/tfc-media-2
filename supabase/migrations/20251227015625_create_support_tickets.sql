-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved')),
    admin_response TEXT,
    responded_by UUID REFERENCES profiles(id),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
ON support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Users can create tickets
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
ON support_tickets FOR INSERT
WITH CHECK (true);

-- Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets"
ON support_tickets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Admins can update tickets
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets"
ON support_tickets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Admins can delete tickets
DROP POLICY IF EXISTS "Admins can delete tickets" ON support_tickets;
CREATE POLICY "Admins can delete tickets"
ON support_tickets FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_support_ticket_timestamp ON support_tickets;
CREATE TRIGGER update_support_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();
