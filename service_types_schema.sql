-- Service Types Table
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2),
    duration_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default service types
INSERT INTO service_types (name, description, base_price, duration_hours, display_order) VALUES
    ('Photography Session', 'Professional photography session for events, portraits, or commercial use', 299.99, 2, 1),
    ('Videography', 'High-quality video production and editing services', 499.99, 4, 2),
    ('Event Coverage', 'Complete photo and video coverage of your special event', 799.99, 8, 3),
    ('Product Photography', 'Professional product shots for e-commerce and marketing', 199.99, 1, 4),
    ('Drone Footage', 'Aerial photography and videography using professional drones', 399.99, 2, 5),
    ('Editing Services', 'Post-production editing for photos and videos', 149.99, null, 6)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read service types
CREATE POLICY "Anyone can view active service types"
ON service_types FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Only authenticated users can manage
CREATE POLICY "Authenticated users can manage service types"
ON service_types FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
