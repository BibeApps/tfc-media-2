-- =====================================================
-- Create Notification Settings Table
-- =====================================================
-- This table stores system-wide notification configuration
-- for email and SMS notifications
-- =====================================================

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Email Configuration
    email_enabled BOOLEAN DEFAULT true,
    email_from_name TEXT DEFAULT 'TFC Media',
    email_from_address TEXT DEFAULT 'notifications@tfcmedia.com',
    
    -- SMS Configuration (Twilio)
    sms_enabled BOOLEAN DEFAULT false,
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    twilio_phone_number TEXT,
    
    -- Notification Events Configuration
    -- Stores which events trigger email/sms and who receives them
    notifications JSONB DEFAULT '{
        "order_placed": {
            "email": true,
            "sms": false,
            "recipients": ["client"]
        },
        "booking_created": {
            "email": true,
            "sms": false,
            "recipients": ["admin"]
        },
        "order_completed": {
            "email": true,
            "sms": false,
            "recipients": ["client"]
        },
        "booking_confirmed": {
            "email": true,
            "sms": false,
            "recipients": ["client"]
        }
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to ensure only one settings row exists (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_singleton 
ON notification_settings ((id IS NOT NULL));

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Admins can update notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Admins can insert notification settings" ON notification_settings;

-- RLS Policy: Only admins can view notification settings
CREATE POLICY "Admins can view notification settings"
    ON notification_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policy: Only admins can update notification settings
CREATE POLICY "Admins can update notification settings"
    ON notification_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policy: Only admins can insert notification settings
CREATE POLICY "Admins can insert notification settings"
    ON notification_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default settings row
INSERT INTO notification_settings (
    email_enabled,
    email_from_name,
    email_from_address,
    sms_enabled
) VALUES (
    true,
    'TFC Media',
    'notifications@tfcmedia.com',
    false
) ON CONFLICT DO NOTHING;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notification_settings'
ORDER BY ordinal_position;

-- Check if default row exists
SELECT * FROM notification_settings;

-- Check RLS policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'notification_settings';

-- =====================================================
-- NOTES
-- =====================================================
-- This table uses a singleton pattern (only one row allowed)
-- The unique index ensures only one settings row can exist
-- 
-- To update settings, use UPDATE not INSERT
-- The admin UI will handle this automatically
--
-- Notification events are stored as JSONB for flexibility
-- New events can be added without schema changes
-- =====================================================
