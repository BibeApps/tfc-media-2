-- Settings Phase 2: Add Business Settings columns to site_settings table
-- This adds booking, payment, and gallery configuration options

-- Booking Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS default_booking_duration INTEGER DEFAULT 120;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS booking_buffer_time INTEGER DEFAULT 30;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS advance_booking_limit INTEGER DEFAULT 90;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2) DEFAULT 25.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS auto_confirm_bookings BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS send_booking_reminders BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS reminder_24h BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS reminder_1week BOOLEAN DEFAULT true;

-- Payment Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS stripe_test_mode BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS convenience_fee_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS accept_credit_cards BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS accept_paypal BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS accept_deposits BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS refund_policy TEXT;

-- Gallery Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'webp'];
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS image_quality INTEGER DEFAULT 85;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS auto_generate_thumbnails BOOLEAN DEFAULT true;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS enable_watermark BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS watermark_text TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS watermark_opacity DECIMAL(3,2) DEFAULT 0.50;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'site_settings'
AND column_name IN (
    'default_booking_duration',
    'booking_buffer_time',
    'stripe_publishable_key',
    'convenience_fee_rate',
    'max_file_size_mb',
    'image_quality'
)
ORDER BY column_name;
