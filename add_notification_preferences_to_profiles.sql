-- =====================================================
-- Add Notification Preferences to Profiles Table
-- =====================================================
-- This migration adds notification preference columns
-- to the profiles table for client-side settings
-- =====================================================

-- Add notification preference columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_project_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_marketing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_downloads BOOLEAN DEFAULT true;

-- Add comment to document the columns
COMMENT ON COLUMN profiles.notification_project_updates IS 'User preference for receiving project update notifications';
COMMENT ON COLUMN profiles.notification_messages IS 'User preference for receiving new message alert notifications';
COMMENT ON COLUMN profiles.notification_marketing IS 'User preference for receiving marketing email notifications';
COMMENT ON COLUMN profiles.notification_downloads IS 'User preference for receiving download reminder notifications';

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check that columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name LIKE 'notification_%'
ORDER BY column_name;

-- Check current values for all users
SELECT 
    id,
    name,
    email,
    notification_project_updates,
    notification_messages,
    notification_marketing,
    notification_downloads
FROM profiles
WHERE role = 'client'
LIMIT 5;

-- =====================================================
-- NOTES
-- =====================================================
-- All notification preferences default to TRUE (enabled)
-- Users can toggle them off in their portal settings
-- 
-- These preferences are separate from the admin-level
-- notification_settings which control system-wide config
--
-- User preferences take precedence - even if admin enables
-- a notification type, it won't send if user has disabled it
-- =====================================================
