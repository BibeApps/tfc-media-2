-- Create site_settings table for Phase 1
-- This stores general company and website settings

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- General Company Information
  company_name TEXT DEFAULT 'TFC Media',
  company_logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_address TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Website Settings
  site_title TEXT DEFAULT 'TFC Media - Professional Photography & Videography',
  site_description TEXT DEFAULT 'Capturing your special moments with professional photography and videography services',
  meta_keywords TEXT[] DEFAULT ARRAY['photography', 'videography', 'events', 'weddings'],
  
  -- Social Media
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  
  -- Business Hours (JSON format)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "10:00", "close": "14:00", "closed": false},
    "sunday": {"open": "10:00", "close": "14:00", "closed": true}
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Enable read access for authenticated users" ON site_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Enable update for authenticated users" ON site_settings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to insert settings (for initial setup)
CREATE POLICY "Enable insert for authenticated users" ON site_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create default settings row if it doesn't exist
INSERT INTO site_settings (company_name, contact_email)
SELECT 'TFC Media', 'contact@tfcmediagroup.com'
WHERE NOT EXISTS (SELECT 1 FROM site_settings LIMIT 1);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
