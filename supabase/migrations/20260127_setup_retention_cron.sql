-- =====================================================
-- Setup pg_cron for Retention Reminder System
-- =====================================================
-- This migration sets up a daily cron job to send
-- retention reminder emails at 9:00 AM UTC
-- =====================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Drop existing job if it exists (safe rerun)
SELECT cron.unschedule('send-retention-reminders-daily') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-retention-reminders-daily'
);

-- Schedule the retention reminder job to run daily at 9:00 AM UTC
-- This will invoke the send-retention-reminders Edge Function
SELECT cron.schedule(
    'send-retention-reminders-daily',
    '0 9 * * *', -- Every day at 9:00 AM UTC
    $$
    SELECT
      net.http_post(
          url:='https://alboektvgruofwtxuhfo.supabase.co/functions/v1/send-retention-reminders',
          headers:=jsonb_build_object(
              'Content-Type','application/json',
              'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'send-retention-reminders-daily';
