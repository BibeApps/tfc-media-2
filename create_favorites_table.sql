-- =====================================================
-- Create Favorites Table
-- =====================================================
-- This table stores client favorites for gallery items
-- Allows clients to save items they like for later viewing
-- =====================================================

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate favorites (same client can't favorite same item twice)
    CONSTRAINT unique_client_gallery_item UNIQUE(client_id, gallery_item_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_favorites_client_id ON favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gallery_item_id ON favorites(gallery_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Clients can insert own favorites" ON favorites;
DROP POLICY IF EXISTS "Clients can delete own favorites" ON favorites;

-- RLS Policy: Clients can only see their own favorites
CREATE POLICY "Clients can view own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = client_id);

-- RLS Policy: Clients can add favorites
CREATE POLICY "Clients can insert own favorites"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = client_id);

-- RLS Policy: Clients can remove their own favorites
CREATE POLICY "Clients can delete own favorites"
    ON favorites FOR DELETE
    USING (auth.uid() = client_id);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'favorites';

-- Check RLS policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'favorites';

-- =====================================================
-- NOTES
-- =====================================================
-- To test favorites:
-- 1. Insert a test favorite:
--    INSERT INTO favorites (client_id, gallery_item_id)
--    VALUES ('your-client-uuid', 'gallery-item-uuid');
--
-- 2. View favorites for a client:
--    SELECT * FROM favorites WHERE client_id = 'your-client-uuid';
--
-- 3. Delete a favorite:
--    DELETE FROM favorites 
--    WHERE client_id = 'your-client-uuid' 
--    AND gallery_item_id = 'gallery-item-uuid';
-- =====================================================
